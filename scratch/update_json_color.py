def main():
    json_path = '/Users/jitkumarsaha/Dynime Inc/dynime.com/dynime-api/database/seeders/supabase_export.json'
    with open(json_path, 'r') as f:
        content = f.read()
    
    # Replace old brand color
    replaced = content.replace('#1919F5', '#635bff').replace('#1919f5', '#635bff')
    
    with open(json_path, 'w') as f:
        f.write(replaced)
        
    print("supabase_export.json updated successfully!")

if __name__ == '__main__':
    main()
