'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  ArrowRight,
  Loader2,
  LayoutDashboard,
  FileText,
  MessageSquare,
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import type { Company } from '@/types';

interface OnboardingWizardProps {
  company: Company;
  userName: string;
}

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export function OnboardingWizard({ company, userName }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const router = useRouter();

  const steps: Step[] = [
    {
      id: 'welcome',
      title: 'Welcome to AgencyOS!',
      description: "Let's get you set up in just a few steps",
      icon: <LayoutDashboard className="h-8 w-8 text-indigo-500" />,
      content: (
        <div className="text-center py-6">
          <h2 className="text-2xl font-bold mb-4">
            Hi {userName.split(' ')[0] || 'there'}!
          </h2>
          <p className="text-muted-foreground mb-4">
            Welcome to AgencyOS. We&apos;re excited to have you on board.
          </p>
          <p className="text-muted-foreground">
            This quick tour will help you understand how to make the most of your
            <span className="font-medium text-foreground capitalize"> {company.plan_tier}</span> plan.
          </p>
        </div>
      ),
    },
    {
      id: 'requests',
      title: 'Create Requests',
      description: 'How to submit work requests',
      icon: <FileText className="h-8 w-8 text-blue-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Requests are how you communicate what you need from us.
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Click &quot;New Request&quot; to create a request</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Describe what you need in detail</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Attach files, links, or video briefs</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Set priority to help us understand urgency</span>
            </li>
          </ul>
          <div className="bg-muted rounded-lg p-4 mt-4">
            <p className="text-sm">
              <strong>Your plan:</strong> You can have up to{' '}
              <span className="text-indigo-600 font-semibold">
                {company.max_active_limit} active request{company.max_active_limit !== 1 ? 's' : ''}
              </span>{' '}
              at a time. Queue up unlimited requests!
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'communication',
      title: 'Async Communication',
      description: 'How we work together',
      icon: <MessageSquare className="h-8 w-8 text-purple-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            We use asynchronous communication for efficient collaboration.
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Add comments to any request to communicate</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Upload files directly to requests for feedback</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Get notified when there&apos;s an update</span>
            </li>
          </ul>
          <div className="bg-muted rounded-lg p-4 mt-4">
            <p className="text-sm">
              <strong>Tip:</strong> Be specific and provide examples when giving feedback. This helps us deliver exactly what you need!
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'notifications',
      title: 'Stay Updated',
      description: 'How to track your requests',
      icon: <Bell className="h-8 w-8 text-amber-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Never miss an update on your requests.
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Check the bell icon for notifications</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Receive email updates for important changes</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Customize notifications in Settings</span>
            </li>
          </ul>
          <div className="bg-muted rounded-lg p-4 mt-4">
            <p className="text-sm">
              <strong>Request flow:</strong> Queue → Active → Review → Done
            </p>
          </div>
        </div>
      ),
    },
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;
  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      completeOnboarding();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const completeOnboarding = async () => {
    setIsCompleting(true);
    try {
      const response = await fetch(`/api/companies/${company.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onboarding_completed_at: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        toast.success('Welcome aboard! You\'re all set.');
        router.refresh();
      } else {
        toast.error('Failed to complete onboarding');
      }
    } catch {
      toast.error('Failed to complete onboarding');
    } finally {
      setIsCompleting(false);
    }
  };

  const skipOnboarding = async () => {
    await completeOnboarding();
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentStepData.icon}
              <div>
                <CardTitle>{currentStepData.title}</CardTitle>
                <CardDescription>{currentStepData.description}</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={skipOnboarding} disabled={isCompleting}>
              Skip
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="mb-6" />
          <div className="min-h-[250px]">
            {currentStepData.content}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0 || isCompleting}
          >
            Back
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </span>
            <Button onClick={handleNext} disabled={isCompleting}>
              {isCompleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Completing...
                </>
              ) : isLastStep ? (
                <>
                  Get Started
                  <CheckCircle2 className="h-4 w-4 ml-2" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
