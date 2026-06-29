import { Suspense } from "react";
import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Sign up · JobWize",
};

export default function SignupPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Start your career journal</CardTitle>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Capture every win. Get the promotion you deserve.
        </p>
      </CardHeader>
      <CardContent>
        <Suspense fallback={null}>
          <SignupForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}
