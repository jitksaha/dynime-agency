import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/db/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

interface NewPageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NewPageDialog = ({ open, onOpenChange }: NewPageDialogProps) => {
  const qc = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");

  const createPage = useMutation({
    mutationFn: async () => {
      const slug = newSlug || newTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const { error } = await db.from("pages").insert({
        title: newTitle,
        slug,
        content: [],
        is_published: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Page created");
      qc.invalidateQueries({ queryKey: ["admin-pages"] });
      onOpenChange(false);
      setNewTitle("");
      setNewSlug("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Page</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Page Title</Label>
            <Input
              value={newTitle}
              onChange={(e) => {
                setNewTitle(e.target.value);
                const autoSlug = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
                if (!newSlug || newSlug === newTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")) {
                  setNewSlug(autoSlug);
                }
              }}
              placeholder="My New Page"
            />
          </div>
          <div>
            <Label>URL Slug</Label>
            <Input
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ""))}
              placeholder="my-new-page"
            />
            <p className="text-xs text-muted-foreground mt-1">yourdomain.com/page/{newSlug || "..."}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => createPage.mutate()} disabled={!newTitle || createPage.isPending}>
            {createPage.isPending ? "Creating..." : "Create Page"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewPageDialog;
