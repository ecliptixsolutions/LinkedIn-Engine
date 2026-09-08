import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { getSessionUser, supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import {
  getApifyLinkedInStatus,
  saveApifyLinkedInSettings,
  testApifyLinkedInSettings,
} from "@/lib/discovery.functions";
import type { Database } from "@/integrations/supabase/types";

type SettingsUpdate = Database["public"]["Tables"]["settings"]["Update"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const getApifyStatus = useServerFn(getApifyLinkedInStatus);
  const saveApifySettings = useServerFn(saveApifyLinkedInSettings);
  const testApifySettings = useServerFn(testApifyLinkedInSettings);
  const { data: apifyStatus } = useQuery({
    queryKey: ["apify-linkedin-status"],
    queryFn: () => getApifyStatus(),
  });
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const user = await getSessionUser();
      const { data } = await supabase
        .from("settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
  });
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const user = await getSessionUser();
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      return data;
    },
  });

  const [form, setForm] = useState<SettingsUpdate>({});
  const [apifyToken, setApifyToken] = useState("");
  const [apifyActorId, setApifyActorId] = useState("");
  const [googleMapsActorId, setGoogleMapsActorId] = useState("");
  const [showApifyToken, setShowApifyToken] = useState(false);
  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);
  useEffect(() => {
    if (apifyStatus?.actorId) setApifyActorId(apifyStatus.actorId);
  }, [apifyStatus?.actorId]);
  useEffect(() => {
    if (apifyStatus?.googleMapsActorId) setGoogleMapsActorId(apifyStatus.googleMapsActorId);
  }, [apifyStatus?.googleMapsActorId]);

  const save = useMutation({
    mutationFn: async () => {
      const user = await getSessionUser();
      const { error } = await supabase.from("settings").upsert({ ...form, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveProfile = useMutation({
    mutationFn: async (patch: ProfileUpdate) => {
      const user = await getSessionUser();
      const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const saveApify = useMutation({
    mutationFn: () =>
      saveApifySettings({
        data: {
          ...(apifyToken.trim() ? { token: apifyToken.trim() } : {}),
          ...(apifyActorId.trim() ? { actorId: apifyActorId.trim() } : {}),
          ...(googleMapsActorId.trim() ? { googleMapsActorId: googleMapsActorId.trim() } : {}),
        },
      }),
    onSuccess: () => {
      setApifyToken("");
      toast.success("Apify connector saved securely");
      qc.invalidateQueries({ queryKey: ["apify-linkedin-status"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const testApify = useMutation({
    mutationFn: () => testApifySettings(),
    onSuccess: () => toast.success("Apify connection is working"),
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Settings"
        description="Manage your workspace, branding, and preferences."
      />

      <Card className="mb-6 p-6">
        <h3 className="mb-4 font-semibold">Your Profile</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Full name</Label>
            <Input
              defaultValue={profile?.full_name ?? ""}
              onBlur={(e) => saveProfile.mutate({ full_name: e.target.value })}
            />
          </div>
          <div>
            <Label>Company</Label>
            <Input
              defaultValue={profile?.company ?? ""}
              onBlur={(e) => saveProfile.mutate({ company: e.target.value })}
            />
          </div>
        </div>
      </Card>

      <Card className="mb-6 p-6">
        <h3 className="mb-4 font-semibold">Company Information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Company name</Label>
            <Input
              value={form.company_name ?? ""}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
            />
          </div>
          <div>
            <Label>Company website</Label>
            <Input
              value={form.company_website ?? ""}
              onChange={(e) => setForm({ ...form, company_website: e.target.value })}
            />
          </div>
          <div>
            <Label>Company email</Label>
            <Input
              value={form.company_email ?? ""}
              onChange={(e) => setForm({ ...form, company_email: e.target.value })}
            />
          </div>
          <div>
            <Label>Company phone</Label>
            <Input
              value={form.company_phone ?? ""}
              onChange={(e) => setForm({ ...form, company_phone: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Brand tagline</Label>
            <Input
              value={form.brand_tagline ?? ""}
              onChange={(e) => setForm({ ...form, brand_tagline: e.target.value })}
            />
          </div>
        </div>
      </Card>

      <Card className="mb-6 p-6">
        <h3 className="mb-4 font-semibold">AI & Outreach Preferences</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Default outreach tone</Label>
            <Select
              value={form.default_tone ?? "professional"}
              onValueChange={(v) => setForm({ ...form, default_tone: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="direct">Direct</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="agency">Agency</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Daily reminder time</Label>
            <Input
              type="time"
              value={form.daily_reminder_time?.slice(0, 5) ?? "09:00"}
              onChange={(e) => setForm({ ...form, daily_reminder_time: e.target.value + ":00" })}
            />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label className="mb-0">Email notifications</Label>
            <p className="text-xs text-muted-foreground">Receive daily reminder digest by email.</p>
          </div>
          <Switch
            checked={!!form.email_notifications}
            onCheckedChange={(v) => setForm({ ...form, email_notifications: v })}
          />
        </div>
      </Card>

      <Card className="mb-6 p-6 border-success/30 bg-success/5">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-success" />
          <div>
            <h3 className="font-semibold">AI Engine</h3>
            <p className="text-xs text-muted-foreground">
              Free local analysis and outreach are active. Gemini is used automatically when a
              backend API key is configured.
            </p>
          </div>
        </div>
      </Card>

      <Card className="mb-6 p-6">
        <div className="mb-5 flex items-center gap-3">
          <ShieldCheck
            className={
              apifyStatus?.configured || apifyStatus?.googleMapsConfigured
                ? "h-5 w-5 text-success"
                : "h-5 w-5 text-warning"
            }
          />
          <div>
            <h3 className="font-semibold">Apify Lead Sources</h3>
            <p className="text-xs text-muted-foreground">
              {apifyStatus?.tokenConfigured
                ? "Token is hidden and stored only on this app server. LinkedIn and Google Maps use the same token."
                : "Not configured. Paste your Apify token and Actor IDs below."}
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>LinkedIn Actor ID</Label>
            <Input
              value={apifyActorId}
              onChange={(event) => setApifyActorId(event.target.value)}
              placeholder="harvestapi~linkedin-profile-search"
            />
          </div>
          <div>
            <Label>Google Maps Actor ID</Label>
            <Input
              value={googleMapsActorId}
              onChange={(event) => setGoogleMapsActorId(event.target.value)}
              placeholder="compass~crawler-google-places"
            />
          </div>
          <div>
            <Label>Replace Apify token</Label>
            <div className="flex gap-2">
              <Input
                type={showApifyToken ? "text" : "password"}
                value={apifyToken}
                onChange={(event) => setApifyToken(event.target.value)}
                placeholder={
                  apifyStatus?.tokenConfigured
                    ? "Token saved - enter only to replace"
                    : "Paste token"
                }
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                title={showApifyToken ? "Hide token" : "Show token"}
                onClick={() => setShowApifyToken((current) => !current)}
              >
                {showApifyToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => saveApify.mutate()} disabled={saveApify.isPending}>
            {saveApify.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save connector
          </Button>
          <Button
            variant="outline"
            onClick={() => testApify.mutate()}
            disabled={!apifyStatus?.tokenConfigured || testApify.isPending}
          >
            {testApify.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test connection
          </Button>
        </div>
      </Card>

      <Button onClick={() => save.mutate()} disabled={save.isPending} className="shadow-md">
        Save settings
      </Button>
    </div>
  );
}
