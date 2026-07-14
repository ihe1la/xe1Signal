"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Shield,
  Bell,
  Key,
  Trash2,
  Loader2,
  Save,
  Image as ImageIcon,
  Mail,
  Lock,
  AlertTriangle,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";

const profileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
  bio: z.string().max(500).optional(),
  website: z.string().url().optional().or(z.literal("")),
  twitter: z.string().max(50).optional(),
  github: z.string().max(50).optional(),
  location: z.string().max(100).optional(),
});

const notificationSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  signalReactions: z.boolean(),
  signalComments: z.boolean(),
  newFollowers: z.boolean(),
  frequencyUpdates: z.boolean(),
  trailUpdates: z.boolean(),
  mentions: z.boolean(),
  weeklyDigest: z.boolean(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(8),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const appearanceSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  compactMode: z.boolean(),
  reducedMotion: z.boolean(),
});

type ProfileForm = z.infer<typeof profileSchema>;
type NotificationForm = z.infer<typeof notificationSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;
type AppearanceForm = z.infer<typeof appearanceSchema>;

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [activeTab, setActiveTab] = React.useState<
    "profile" | "notifications" | "appearance" | "security" | "danger"
  >("profile");
  const [isSaving, setIsSaving] = React.useState(false);
  const [isImageSaving, setIsImageSaving] = React.useState(false);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
  const [coverPreview, setCoverPreview] = React.useState<string | null>(null);
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [coverFile, setCoverFile] = React.useState<File | null>(null);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: session?.user?.name || "",
      username: session?.user?.username || "",
      bio: "",
      website: "",
      twitter: "",
      github: "",
      location: "",
    },
  });

  const notificationForm = useForm<NotificationForm>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      emailNotifications: true,
      pushNotifications: true,
      signalReactions: true,
      signalComments: true,
      newFollowers: true,
      frequencyUpdates: true,
      trailUpdates: true,
      mentions: true,
      weeklyDigest: false,
    },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const appearanceForm = useForm<AppearanceForm>({
    resolver: zodResolver(appearanceSchema),
    defaultValues: {
      theme: "system",
      compactMode: false,
      reducedMotion: false,
    },
  });

  React.useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/user/profile").then((response) => response.ok ? response.json() : null).then((data) => {
      if (data?.user) {
        profileForm.reset({ name: data.user.name || "", username: data.user.username || "", bio: data.user.bio || "", website: "", twitter: "", github: "", location: "" });
        setAvatarPreview(data.user.avatarUrl || null);
        setCoverPreview(data.user.bannerUrl || null);
      }
    }).catch(() => undefined);
  }, [session?.user?.id, profileForm]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        toast.error("Use a JPG, PNG, or WebP image");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Avatar must be under 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
      setAvatarFile(file);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        toast.error("Use a JPG, PNG, or WebP image");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Cover image must be under 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setCoverPreview(reader.result as string);
      reader.readAsDataURL(file);
      setCoverFile(file);
    }
  };

  const saveProfileImages = async () => {
    if (!avatarFile && !coverFile) return;
    setIsImageSaving(true);
    try {
      let savedAvatar: string | undefined;
      for (const [kind, file] of [["avatar", avatarFile], ["banner", coverFile]] as const) {
        if (!file) continue;
        const body = new FormData();
        body.set("kind", kind);
        body.set("file", file);
        const response = await fetch("/api/user/profile-image", { method: "POST", body });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `Failed to save ${kind}`);
        if (kind === "avatar") savedAvatar = result.url;
      }
      if (savedAvatar) await update({ avatarUrl: savedAvatar });
      setAvatarFile(null);
      setCoverFile(null);
      router.refresh();
      toast.success("Profile images updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Profile images could not be saved");
    } finally {
      setIsImageSaving(false);
    }
  };

  const onProfileSubmit = async (data: ProfileForm) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        toast.success("Profile updated");
        if (
          data.name !== session?.user?.name ||
          data.username !== session?.user?.username
        ) {
          await update();
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update profile");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordForm) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });
      if (res.ok) {
        toast.success("Password changed");
        passwordForm.reset();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to change password");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  const onAppearanceSubmit = async (data: AppearanceForm) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/appearance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        toast.success("Appearance settings saved");
        // Apply theme immediately
        document.documentElement.classList.remove("light", "dark");
        if (
          data.theme === "dark" ||
          (data.theme === "system" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches)
        ) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.add("light");
        }
      } else {
        toast.error("Failed to save settings");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        "Are you sure you want to delete your account? This action cannot be undone.",
      )
    )
      return;
    if (
      !confirm(
        "This will permanently delete all your signals, frequencies, and trails. Continue?",
      )
    )
      return;

    try {
      const res = await fetch("/api/user/delete", { method: "DELETE" });
      if (res.ok) {
        toast.success("Account deleted");
        router.push("/auth/signout");
      } else {
        toast.error("Failed to delete account");
      }
    } catch {
      toast.error("Something went wrong");
    }
  };

  return (
    <AppLayout showRightSidebar={false}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-heading-xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and preferences
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(
              value as
                | "profile"
                | "notifications"
                | "appearance"
                | "security"
                | "danger",
            )
          }
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" /> Profile
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" /> Notifications
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <Moon className="h-4 w-4 mr-2" /> Appearance
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="h-4 w-4 mr-2" /> Security
            </TabsTrigger>
            <TabsTrigger value="danger">
              <Trash2 className="h-4 w-4 mr-2" /> Danger Zone
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Avatar & Cover</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="relative">
                  {coverPreview ? (
                    <div className="h-48 w-full rounded-lg overflow-hidden relative">
                      <img
                        src={coverPreview}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-48 w-full rounded-lg bg-muted/50 border-2 border-dashed border-border flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  )}
                  <label className="absolute bottom-4 right-4 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverChange}
                      className="hidden"
                    />
                    <Button variant="secondary" size="sm" className="gap-1">
                      <ImageIcon className="h-4 w-4" />
                      Change Cover
                    </Button>
                  </label>
                </div>

                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      {avatarPreview ? (
                        <AvatarImage src={avatarPreview} alt="" />
                      ) : session?.user?.avatarUrl ? (
                        <AvatarImage src={session.user.avatarUrl} alt="" />
                      ) : (
                        <AvatarFallback className="text-3xl">
                          {session?.user?.name?.[0] ||
                            session?.user?.username?.[0]}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <label className="absolute bottom-0 right-0 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                      >
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                    </label>
                  </div>
                  <div>
                    <p className="font-medium">Avatar</p>
                    <p className="text-sm text-muted-foreground">
                      JPG, PNG or WebP. Max 2MB.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={saveProfileImages}
                  disabled={isImageSaving || (!avatarFile && !coverFile)}
                  className="w-full sm:w-auto"
                >
                  {isImageSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {isImageSaving ? "Uploading..." : "Save avatar & cover"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="name">Display Name</Label>
                    <Input
                      id="name"
                      {...profileForm.register("name")}
                      placeholder="Your name"
                    />
                    {profileForm.formState.errors.name && (
                      <p className="text-sm text-destructive">
                        {profileForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        @
                      </span>
                      <Input
                        id="username"
                        {...profileForm.register("username")}
                        placeholder="username"
                        className="pl-7"
                      />
                    </div>
                    {profileForm.formState.errors.username && (
                      <p className="text-sm text-destructive">
                        {profileForm.formState.errors.username.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      3-30 characters. Letters, numbers, underscores, hyphens.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      {...profileForm.register("bio")}
                      placeholder="Tell us about yourself..."
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {profileForm.watch("bio")?.length || 0}/500
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        {...profileForm.register("website")}
                        placeholder="https://example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        {...profileForm.register("location")}
                        placeholder="San Francisco, CA"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="twitter">Twitter/X</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          @
                        </span>
                        <Input
                          id="twitter"
                          {...profileForm.register("twitter")}
                          placeholder="username"
                          className="pl-7"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="github">GitHub</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          @
                        </span>
                        <Input
                          id="github"
                          {...profileForm.register("github")}
                          placeholder="username"
                          className="pl-7"
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="w-full sm:w-auto"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={notificationForm.handleSubmit(async (data) => {
                    setIsSaving(true);
                    try {
                      const res = await fetch("/api/user/notifications", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(data),
                      });
                      if (res.ok) toast.success("Settings saved");
                      else toast.error("Failed to save");
                    } catch {
                      toast.error("Error");
                    } finally {
                      setIsSaving(false);
                    }
                  })}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch
                      {...notificationForm.register("emailNotifications")}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive browser push notifications
                      </p>
                    </div>
                    <Switch
                      {...notificationForm.register("pushNotifications")}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">
                      Activity Notifications
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {[
                        {
                          key: "signalReactions",
                          label: "Signal reactions",
                          desc: "When someone reacts to your signals",
                        },
                        {
                          key: "signalComments",
                          label: "Signal comments",
                          desc: "When someone comments on your signals",
                        },
                        {
                          key: "newFollowers",
                          label: "New followers",
                          desc: "When someone follows you",
                        },
                        {
                          key: "frequencyUpdates",
                          label: "Frequency updates",
                          desc: "New signals in followed frequencies",
                        },
                        {
                          key: "trailUpdates",
                          label: "Trail updates",
                          desc: "Updates to followed research trails",
                        },
                        {
                          key: "mentions",
                          label: "Mentions",
                          desc: "When someone mentions you",
                        },
                      ].map(({ key, label, desc }) => (
                        <div
                          key={key}
                          className="flex items-center justify-between"
                        >
                          <div>
                            <Label className="font-normal">{label}</Label>
                            <p className="text-xs text-muted-foreground">
                              {desc}
                            </p>
                          </div>
                          <Switch {...notificationForm.register(key as any)} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Weekly Digest</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive a weekly summary of your archive activity
                      </p>
                    </div>
                    <Switch {...notificationForm.register("weeklyDigest")} />
                  </div>

                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Notification Settings"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Theme & Display</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={appearanceForm.handleSubmit(onAppearanceSubmit)}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <Label>Theme</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: "light", label: "Light", icon: Sun },
                        { value: "dark", label: "Dark", icon: Moon },
                        { value: "system", label: "System", icon: Monitor },
                      ].map(({ value, label, icon: Icon }) => (
                        <label
                          key={value}
                          className={cn(
                            "relative cursor-pointer",
                            appearanceForm.watch("theme") === value
                              ? "ring-2 ring-primary"
                              : "",
                          )}
                        >
                          <input
                            type="radio"
                            value={value}
                            {...appearanceForm.register("theme")}
                            className="sr-only"
                          />
                          <div className="p-4 rounded-lg border bg-card text-center transition-all">
                            <Icon className="h-6 w-6 mx-auto mb-2" />
                            <span className="font-medium">{label}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-normal">Compact Mode</Label>
                        <p className="text-sm text-muted-foreground">
                          Reduce spacing for denser information display
                        </p>
                      </div>
                      <Switch {...appearanceForm.register("compactMode")} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-normal">Reduced Motion</Label>
                        <p className="text-sm text-muted-foreground">
                          Minimize animations and transitions
                        </p>
                      </div>
                      <Switch {...appearanceForm.register("reducedMotion")} />
                    </div>
                  </div>

                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Appearance Settings"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                  className="space-y-4 max-w-md"
                >
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      {...passwordForm.register("currentPassword")}
                      autoComplete="current-password"
                    />
                    {passwordForm.formState.errors.currentPassword && (
                      <p className="text-sm text-destructive">
                        {passwordForm.formState.errors.currentPassword.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      {...passwordForm.register("newPassword")}
                      autoComplete="new-password"
                    />
                    {passwordForm.formState.errors.newPassword && (
                      <p className="text-sm text-destructive">
                        {passwordForm.formState.errors.newPassword.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      At least 8 characters
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">
                      Confirm New Password
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      {...passwordForm.register("confirmPassword")}
                      autoComplete="new-password"
                    />
                    {passwordForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-destructive">
                        {passwordForm.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Changing..." : "Change Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Connected Accounts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Email & Password</p>
                        <p className="text-sm text-muted-foreground">
                          Primary sign-in method
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">Connected</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    OAuth providers (GitHub, Google, Discord) coming soon.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Two-Factor Authentication
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  2FA adds an extra layer of security to your account. Coming
                  soon.
                </p>
                <Button
                  variant="outline"
                  className="text-destructive border-destructive hover:bg-destructive/10"
                  disabled
                >
                  Enable 2FA
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Danger Zone Tab */}
          <TabsContent value="danger" className="space-y-6">
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                  <h4 className="font-medium text-destructive mb-1">
                    Delete Account
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Permanently delete your account and all associated data.
                    This action cannot be undone.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Account
                  </Button>
                </div>

                <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <h4 className="font-medium text-amber-500 mb-1">
                    Export Data
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Download a copy of all your signals, frequencies, trails,
                    and profile data.
                  </p>
                  <Button variant="outline" asChild>
                    <a href="/api/user/export">Export Data</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
