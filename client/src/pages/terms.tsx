import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, FileText, CheckCircle2, AlertCircle, Shield } from "lucide-react";
import { Link } from "wouter";
import { usePageTitle } from "@/hooks/use-page-title";

export default function Terms() {
  usePageTitle("Terms of Use");
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Terms of Use</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Terms of Use</CardTitle>
              <CardDescription>Last updated: January 2026</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] rounded-md border p-4">
                <div className="space-y-6 text-sm">
                  <section>
                    <h3 className="font-semibold text-base mb-2">1. Acceptance of Terms</h3>
                    <p className="text-muted-foreground">
                      By accessing and using API Weaver, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to abide by these terms, please do not use this service.
                    </p>
                  </section>

                  <Separator />

                  <section>
                    <h3 className="font-semibold text-base mb-2">2. Description of Service</h3>
                    <p className="text-muted-foreground">
                      API Weaver provides a unified API gateway for connecting multiple external services including AI services (Claude, GPT, Gemini, Perplexity), cloud platforms (Google Cloud, Vercel, Supabase), and developer tools (GitHub, Notion, n8n, Comet ML).
                    </p>
                  </section>

                  <Separator />

                  <section>
                    <h3 className="font-semibold text-base mb-2">3. User Responsibilities</h3>
                    <p className="text-muted-foreground mb-2">You agree to:</p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      <li>Provide accurate and complete information when creating an account</li>
                      <li>Maintain the security of your API keys and credentials</li>
                      <li>Use the service in compliance with all applicable laws and regulations</li>
                      <li>Not attempt to gain unauthorized access to the service or its systems</li>
                      <li>Not use the service to transmit malicious code or harmful content</li>
                    </ul>
                  </section>

                  <Separator />

                  <section>
                    <h3 className="font-semibold text-base mb-2">4. API Usage and Rate Limits</h3>
                    <p className="text-muted-foreground">
                      The service implements rate limiting (100 requests per 15 minutes per IP) to ensure fair usage. Excessive use that impacts service availability for other users may result in temporary or permanent suspension of access.
                    </p>
                  </section>

                  <Separator />

                  <section>
                    <h3 className="font-semibold text-base mb-2">5. Third-Party Services</h3>
                    <p className="text-muted-foreground">
                      API Weaver integrates with third-party services. Your use of these services is subject to their respective terms of service and privacy policies. We are not responsible for the availability or functionality of third-party services.
                    </p>
                  </section>

                  <Separator />

                  <section>
                    <h3 className="font-semibold text-base mb-2">6. Intellectual Property</h3>
                    <p className="text-muted-foreground">
                      The service and its original content, features, and functionality are owned by API Weaver and are protected by international copyright, trademark, and other intellectual property laws.
                    </p>
                  </section>

                  <Separator />

                  <section>
                    <h3 className="font-semibold text-base mb-2">7. Limitation of Liability</h3>
                    <p className="text-muted-foreground">
                      In no event shall API Weaver be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
                    </p>
                  </section>

                  <Separator />

                  <section>
                    <h3 className="font-semibold text-base mb-2">8. Modifications to Terms</h3>
                    <p className="text-muted-foreground">
                      We reserve the right to modify or replace these terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
                    </p>
                  </section>

                  <Separator />

                  <section>
                    <h3 className="font-semibold text-base mb-2">9. Contact Information</h3>
                    <p className="text-muted-foreground">
                      If you have any questions about these Terms, please contact us through the appropriate channels.
                    </p>
                  </section>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Your Rights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Access to the service</li>
                  <li>Data portability</li>
                  <li>Account deletion</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-500" />
                  Security
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Encrypted connections</li>
                  <li>Secure authentication</li>
                  <li>Rate limiting protection</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Important Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Terms may change</li>
                  <li>Review regularly</li>
                  <li>Contact for questions</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
