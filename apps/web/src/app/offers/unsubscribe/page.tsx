"use client";

import { T } from "@/components/ui/T";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { recoveryOffersApi } from "@/lib/api";
import { useT } from "@/providers/translation-provider";
import { Loader2, MailX, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function UnsubscribeForm() {
  const t = useT();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [alreadyUnsubscribed, setAlreadyUnsubscribed] = useState(false);
  const [error, setError] = useState("");

  const unsubscribe = async () => {
    if (!token) {
      setError("This unsubscribe link is missing a token.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await recoveryOffersApi.unsubscribe(token);
      setAlreadyUnsubscribed(Boolean(response.data.alreadyUnsubscribed));
      setDone(true);
    } catch (unsubscribeError: any) {
      setError(
        unsubscribeError?.response?.data?.message ||
          unsubscribeError?.message ||
          "This unsubscribe link is invalid.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white px-4 py-12 dark:from-gray-950 dark:to-gray-900">
      <Card className="mx-auto max-w-lg border-amber-200 shadow-xl dark:border-amber-900">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <MailX className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl">
            <T>Unsubscribe from Orivraa offers</T>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 text-center">
          {done ? (
            <>
              <ShieldCheck className="mx-auto h-12 w-12 text-green-600" />
              <p className="font-semibold text-green-700 dark:text-green-300">
                {alreadyUnsubscribed ? (
                  <T>This email is already unsubscribed from product offers.</T>
                ) : (
                  <T>
                    You will not receive future Orivraa product offer emails.
                  </T>
                )}
              </p>
              <Button asChild className="w-full">
                <Link href="/">
                  <T>Return to Orivraa</T>
                </Link>
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                <T>
                  Click below to stop festival and recovery offer emails. This
                  does not close your shop account or stop invoices, receipts,
                  or security messages.
                </T>
              </p>
              {error && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  {t(error)}
                </p>
              )}
              <Button
                className="w-full"
                disabled={submitting || !token}
                onClick={() => void unsubscribe()}
              >
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <T>Unsubscribe from offer emails</T>
              </Button>
              <p className="text-xs text-muted-foreground">
                <T>Need help?</T> support@orivraa.com
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-amber-600" />
        </main>
      }
    >
      <UnsubscribeForm />
    </Suspense>
  );
}
