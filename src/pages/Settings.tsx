import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, Phone, MessageSquare, Download } from "lucide-react";

export default function Settings() {
  return (
    <Layout>
      <div className="space-y-6 max-w-2xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-legacy-primary flex items-center gap-3">
            <SettingsIcon className="w-8 h-8" />
            Messaging Settings
          </h1>
          <p className="text-legacy-ink/70 mt-2">
            Configure your phone number and message frequency preferences
          </p>
        </div>

        {/* Phone Number Settings */}
        <Card className="shadow-paper">
          <CardHeader>
            <CardTitle className="text-legacy-primary flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Phone Number
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input 
                id="phone"
                type="tel"
                placeholder="(310) 111-1111"
                defaultValue="(310) 111-1111"
                className="border-legacy-border focus:border-legacy-primary"
              />
              <p className="text-sm text-legacy-ink/60">
                This is where you'll send your legacy journal messages
              </p>
            </div>
            <Button variant="outline" size="sm">
              Test Phone Number
            </Button>
          </CardContent>
        </Card>

        {/* Message Frequency */}
        <Card className="shadow-paper">
          <CardHeader>
            <CardTitle className="text-legacy-primary flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Prompt Message Frequency
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>How often would you like reminder prompts?</Label>
              <Select defaultValue="weekly">
                <SelectTrigger className="border-legacy-border focus:border-legacy-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="random">Random</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-legacy-ink/60">
                We'll send gentle prompts to help you capture memories and wisdom
              </p>
            </div>
          </CardContent>
        </Card>

        <Separator className="bg-legacy-border" />

        {/* Export Section */}
        <Card className="shadow-paper bg-gradient-warm border-legacy-border">
          <CardHeader>
            <CardTitle className="text-legacy-primary flex items-center gap-2">
              <Download className="w-5 h-5" />
              Export Your Legacy Journal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-legacy-ink/70">
              Export your journal entries at any time. Choose from free basic export 
              or premium formatted versions.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Free Export
              </Button>
              <Button variant="accent" className="flex-1">
                Premium Export - $1.99
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Save Settings */}
        <div className="flex justify-end pt-4">
          <Button variant="hero">
            Save Settings
          </Button>
        </div>
      </div>
    </Layout>
  );
}