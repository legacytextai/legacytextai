import React, { useState, useEffect } from 'react';
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Prompt {
  id: number;
  text: string;
  created_at: string;
  source_type: string;
}

export default function AdminPromptsView() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from("prompts")
        .select("id, text, created_at, source_type")
        .eq("source_type", "handwritten")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPrompts(data || []);
    } catch (error) {
      console.error("Error fetching prompts:", error);
      toast.error("Failed to load prompts");
    } finally {
      setLoading(false);
    }
  };

  const filtered = prompts.filter((p) =>
    p.text.toLowerCase().includes(search.toLowerCase())
  );

  const exportMarkdown = () => {
    const md =
      "# 🖊️ LegacyText Handwritten Prompts Export\n\n" +
      `**Exported:** ${new Date().toLocaleString()}\n` +
      `**Total Prompts:** ${filtered.length}\n\n---\n\n` +
      filtered
        .map((p, i) => `${i + 1}. ${p.text.trim()}`)
        .join("\n\n");

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `handwritten-prompts-export-${new Date().toISOString().split("T")[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Markdown exported successfully");
  };

  const exportCSV = () => {
    const csv =
      "id,text,created_at,source_type\n" +
      filtered
        .map(
          (p) =>
            `${p.id},"${p.text.replace(/"/g, '""')}",${p.created_at},${p.source_type}`
        )
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `handwritten-prompts-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully");
  };

  return (
    <Layout>
      <div className="container mx-auto px-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">✍️</span>
              <CardTitle>Handwritten Prompts Viewer</CardTitle>
            </div>
            <CardDescription>
              View and export all handwritten prompts from the Supabase database. This is the source of truth for all curated prompts.
            </CardDescription>
          </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search prompts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={exportMarkdown} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Markdown
              </Button>
              <Button onClick={exportCSV} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Showing {filtered.length} of {prompts.length} prompts
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading prompts...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? "No prompts match your search" : "No prompts found"}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 font-medium">ID</th>
                      <th className="text-left p-3 font-medium">Prompt Text</th>
                      <th className="text-left p-3 font-medium">Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p.id} className="border-t hover:bg-muted/50">
                        <td className="p-3 font-mono text-xs">{p.id}</td>
                        <td className="p-3">
                          {p.text.length > 120
                            ? `${p.text.slice(0, 120)}...`
                            : p.text}
                        </td>
                        <td className="p-3 text-muted-foreground whitespace-nowrap">
                          {new Date(p.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </Layout>
  );
}
