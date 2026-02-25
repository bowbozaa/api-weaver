import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Scale, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { usePageTitle } from "@/hooks/use-page-title";

export default function License() {
  usePageTitle("License");
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
            <Scale className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">License</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    MIT License
                  </CardTitle>
                  <CardDescription>Open source software license</CardDescription>
                </div>
                <Badge variant="outline">Open Source</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 rounded-md border p-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="text-sm text-muted-foreground mb-4">Copyright (c) 2024 API Weaver</p>
                  
                  <p className="text-sm mb-4">
                    Permission is hereby granted, free of charge, to any person obtaining a copy
                    of this software and associated documentation files (the "Software"), to deal
                    in the Software without restriction, including without limitation the rights
                    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
                    copies of the Software, and to permit persons to whom the Software is
                    furnished to do so, subject to the following conditions:
                  </p>
                  
                  <p className="text-sm mb-4">
                    The above copyright notice and this permission notice shall be included in all
                    copies or substantial portions of the Software.
                  </p>
                  
                  <p className="text-sm mb-4 font-medium">
                    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
                    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
                    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
                    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
                    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
                    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
                    SOFTWARE.
                  </p>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                What You Can Do
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Commercial use</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Modification</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Distribution</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Private use</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Sublicense</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Conditions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                  <div>
                    <span className="text-sm font-medium">License and copyright notice</span>
                    <p className="text-sm text-muted-foreground">A copy of the license and copyright notice must be included with the software.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          <Card>
            <CardHeader>
              <CardTitle>Third-Party Licenses</CardTitle>
              <CardDescription>This project uses the following open source packages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-center justify-between border rounded-md p-3">
                  <span className="text-sm font-medium">Express.js</span>
                  <Badge variant="outline">MIT</Badge>
                </div>
                <div className="flex items-center justify-between border rounded-md p-3">
                  <span className="text-sm font-medium">React</span>
                  <Badge variant="outline">MIT</Badge>
                </div>
                <div className="flex items-center justify-between border rounded-md p-3">
                  <span className="text-sm font-medium">Vite</span>
                  <Badge variant="outline">MIT</Badge>
                </div>
                <div className="flex items-center justify-between border rounded-md p-3">
                  <span className="text-sm font-medium">Tailwind CSS</span>
                  <Badge variant="outline">MIT</Badge>
                </div>
                <div className="flex items-center justify-between border rounded-md p-3">
                  <span className="text-sm font-medium">Drizzle ORM</span>
                  <Badge variant="outline">Apache 2.0</Badge>
                </div>
                <div className="flex items-center justify-between border rounded-md p-3">
                  <span className="text-sm font-medium">Recharts</span>
                  <Badge variant="outline">MIT</Badge>
                </div>
                <div className="flex items-center justify-between border rounded-md p-3">
                  <span className="text-sm font-medium">Zod</span>
                  <Badge variant="outline">MIT</Badge>
                </div>
                <div className="flex items-center justify-between border rounded-md p-3">
                  <span className="text-sm font-medium">TanStack Query</span>
                  <Badge variant="outline">MIT</Badge>
                </div>
                <div className="flex items-center justify-between border rounded-md p-3">
                  <span className="text-sm font-medium">Lucide Icons</span>
                  <Badge variant="outline">ISC</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
