import { useState } from "react";
import { useLocation } from "wouter";
import { useAdminLogin } from "@workspace/api-client-react";
import { setAdminToken } from "@/lib/auth";
import { Store, Lock, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const loginMutation = useAdminLogin({
    mutation: {
      onSuccess: (data) => {
        if (data.success && data.token) {
          setAdminToken(data.token);
          setLocation("/admin/dashboard");
        } else {
          toast({
            variant: "destructive",
            title: "Authentication Failed",
            description: "Invalid password provided.",
          });
        }
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "Error",
          description: "An error occurred during login.",
        });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    loginMutation.mutate({ data: { password } });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 p-4">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-xl overflow-hidden border border-border">
        <div className="bg-primary p-8 text-center text-primary-foreground">
          <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto flex items-center justify-center mb-4">
            <Store className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Portal</h1>
          <p className="text-primary-foreground/80 text-sm mt-2">Manage your shop catalog</p>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Enter admin password"
                  className="pl-10 h-12 rounded-xl bg-muted/50 border-transparent focus-visible:ring-primary"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              disabled={loginMutation.isPending || !password}
              className="w-full h-12 rounded-xl text-base font-bold shadow-md flex items-center gap-2 group"
            >
              {loginMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Access Dashboard
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>
          
          <div className="mt-8 text-center">
            <Button variant="link" onClick={() => setLocation("/")} className="text-muted-foreground">
              Return to Store
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
