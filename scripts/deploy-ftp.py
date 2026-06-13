import os
import sys
import zipfile
import shutil
import subprocess
import getpass
from ftplib import FTP
import urllib.request
import urllib.parse

# Config
DEPLOY_TOKEN = "deploy_token_7782"
WEBHOOK_URL = f"https://dynime.com/deploy-api.php?token={DEPLOY_TOKEN}"

def load_env_credentials():
    env_file = ".env.deploy"
    server = ""
    user = ""
    password = ""
    if os.path.exists(env_file):
        with open(env_file, "r") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                parts = line.split("=", 1)
                if len(parts) == 2:
                    key = parts[0].strip()
                    val = parts[1].strip().strip('"').strip("'")
                    if key == "DEPLOY_FTP_SERVER":
                        server = val
                    elif key == "DEPLOY_FTP_USERNAME":
                        user = val
                    elif key == "DEPLOY_FTP_PASSWORD":
                        password = val
    return server, user, password

def save_env_credentials(server, user, password):
    env_file = ".env.deploy"
    with open(env_file, "w") as f:
        f.write("# Dynime Hostinger Local FTP Deployment Config\n")
        f.write(f"DEPLOY_FTP_SERVER='{server}'\n")
        f.write(f"DEPLOY_FTP_USERNAME='{user}'\n")
        f.write(f"DEPLOY_FTP_PASSWORD='{password}'\n")
    print(f"Saved credentials to {env_file} (added to .gitignore automatically)")
    # Add to .gitignore if not present
    if os.path.exists(".gitignore"):
        with open(".gitignore", "r+") as f:
            content = f.read()
            if ".env.deploy" not in content:
                f.write("\n# FTP Deploy credentials\n.env.deploy\n")

def make_zip(source_dir, output_zip_path, exclude_dirs=None, exclude_files=None):
    if exclude_dirs is None:
        exclude_dirs = []
    if exclude_files is None:
        exclude_files = []
    
    print(f"Packaging {source_dir} into {output_zip_path}...")
    with zipfile.ZipFile(output_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(source_dir):
            # Exclude directories
            dirs[:] = [d for d in dirs if d not in exclude_dirs and not d.startswith(".")]
            
            for file in files:
                if file.startswith(".") or file in exclude_files:
                    continue
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, source_dir)
                zipf.write(file_path, arcname)
    print(f"Zip created: {output_zip_path} ({os.path.getsize(output_zip_path) // 1024} KB)")

def delete_ftp_dir_recursively(ftp, path):
    try:
        names = ftp.nlst(path)
    except Exception:
        # Path is likely a file or empty directory
        try:
            ftp.delete(path)
            print(f"Deleted file: {path}")
        except Exception:
            pass
        return

    for name in names:
        if name.endswith('.') or name.endswith('..'):
            continue
        delete_ftp_dir_recursively(ftp, name)
    
    try:
        ftp.rmd(path)
        print(f"Deleted directory: {path}")
    except Exception as e:
        print(f"Error deleting directory {path}: {e}")

def main():
    print("=== Dynime Local Hostinger Deployer ===")
    
    # 1. Load credentials
    server, user, password = load_env_credentials()
    if not server or not user or not password:
        print("Please enter your Hostinger FTP Credentials:")
        server = input("FTP Server (e.g. ftp.dynime.com or hosting IP): ").strip()
        user = input("FTP Username: ").strip()
        password = getpass.getpass("FTP Password: ").strip()
        save = input("Do you want to save these credentials to .env.deploy? (y/n): ").strip().lower()
        if save == 'y' or save == 'yes':
            save_env_credentials(server, user, password)

    # 2. Build local frontend
    print("\nBuilding frontend locally...")
    try:
        subprocess.run("npm run build", shell=True, check=True)
    except subprocess.CalledProcessError:
        print("Build failed! Aborting deployment.")
        sys.exit(1)

    # 3. Create frontend zip
    frontend_zip = "dynime-frontend.zip"
    if os.path.exists(frontend_zip):
        os.remove(frontend_zip)
    make_zip("dist", frontend_zip)

    # 4. Install backend dependencies locally and create backend zip
    print("\nPreparing backend packages...")
    backend_zip = "dynime-api.zip"
    if os.path.exists(backend_zip):
        os.remove(backend_zip)
    
    # Run composer install in dynime-api
    try:
        print("Installing Composer dependencies for production...")
        subprocess.run("composer install --no-dev --optimize-autoloader", shell=True, check=True, cwd="dynime-api")
    except Exception as e:
        print(f"Warning: Local composer install failed ({e}). Using existing vendor files.")

    make_zip(
        "dynime-api", 
        backend_zip, 
        exclude_dirs=["tests", "storage/logs", "storage/framework/cache/data"], 
        exclude_files=[".env", ".phpunit.result.cache"]
    )

    # 5. Connect to FTP and upload
    print(f"\nConnecting to FTP server {server}...")
    try:
        ftp = FTP(server)
        ftp.login(user, password)
        print("FTP connection established successfully.")
    except Exception as e:
        print(f"FTP Connection Failed: {e}")
        sys.exit(1)

    # Detect directory structure & check for nested public_html
    print("Checking remote file list...")
    remote_files = ftp.nlst()
    
    # Safety checks and nested public_html deletion
    # If the root has 'public_html' folder but we are supposed to be inside it,
    # wait: let's look at the remote directories.
    print(f"FTP root directory contains: {remote_files}")
    
    # Check if there is a duplicate nested public_html inside the current FTP directory
    if "public_html" in remote_files:
        # Let's double check if setup-hostinger.php is also at root
        if "setup-hostinger.php" in remote_files or "index.html" in remote_files:
            print("WARNING: Detected nested 'public_html' folder inside a chrooted FTP root!")
            confirm = input("Do you want to delete this nested 'public_html' directory to fix routing? (y/n): ").strip().lower()
            if confirm == 'y' or confirm == 'yes':
                print("Deleting nested public_html directory recursively...")
                delete_ftp_dir_recursively(ftp, "public_html")
                print("Nested public_html directory successfully deleted.")

    # Upload files directly to current remote dir (which is the true public_html)
    print("\nUploading deployment packages...")
    
    # Upload deploy-api.php and setup-hostinger.php first
    for php_file in ["deploy-api.php", "setup-hostinger.php"]:
        local_path = os.path.join("public", php_file)
        if os.path.exists(local_path):
            print(f"Uploading {php_file}...")
            with open(local_path, "rb") as f:
                ftp.storbinary(f"STOR {php_file}", f)

    # Upload zips
    for zip_file in [frontend_zip, backend_zip]:
        if os.path.exists(zip_file):
            print(f"Uploading {zip_file}...")
            with open(zip_file, "rb") as f:
                ftp.storbinary(f"STOR {zip_file}", f)
            # Remove local zip after upload
            os.remove(zip_file)

    ftp.quit()
    print("Upload complete!")

    # 6. Trigger Webhook
    print(f"\nTriggering extraction webhook: {WEBHOOK_URL}...")
    try:
        response = urllib.request.urlopen(WEBHOOK_URL, timeout=60)
        html = response.read().decode('utf-8')
        print("Webhook response:")
        # strip html tags for cleaner terminal output
        import re
        clean_text = re.sub('<[^<]+?>', '', html)
        print(clean_text.strip())
        print("\nDeployment completed successfully!")
    except Exception as e:
        print(f"Failed to trigger webhook extraction: {e}")
        print("Please access the link manually in your browser to complete extraction:")
        print(WEBHOOK_URL)

if __name__ == "__main__":
    main()
