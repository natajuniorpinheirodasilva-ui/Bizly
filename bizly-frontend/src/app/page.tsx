'use client'

import { useState } from "react"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import Link from "next/link"
import { Calendar, Users, ShieldCheck, UserPlus, Settings, Rocket, ArrowRight, CheckCircle2, ChevronRight, X } from "lucide-react"

export default function Home() {
  // faq state management
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  // faq data
  const faqs = [
    {
      question: "Can I cancel my subscription at any time?",
      answer: "Yes, you can cancel or pause your subscription from your dashboard at any time. Your data will be kept safe for 90 days if you decide to return."
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. We use enterprise-grade encryption and a strict multi-tenant architecture, meaning your data is logically isolated from every other user on the platform."
    },
    {
      question: "Do you offer custom integrations?",
      answer: "The Professional and Business plans come with access to our REST API. If you need enterprise-level custom integrations, please contact our support team."
    },
    {
      question: "How does the onboarding process work?",
      answer: "Once you create your account, our setup wizard will guide you through adding your team, setting your availability, and importing any existing client lists in under 5 minutes."
    }
  ]

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground relative overflow-hidden">
      <Navbar />

      {/* background glow effect */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
        <div className="relative left-[calc(50%-11rem)] aspect-1155/678 w-144.5 -translate-x-1/2 rotate-30 bg-linear-to-tr from-primary to-primary/20 opacity-20 sm:left-[calc(50%-30rem)] sm:w-288.75" />
      </div>

      <main className="flex-1">
        {/* hero section */}
        <section className="mx-auto max-w-7xl px-6 pb-24 pt-32 text-center lg:pt-40 relative">
          <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight text-foreground sm:text-7xl">
            Manage your entire business in <span className="text-primary relative inline-block">
              one platform
              <span className="absolute -bottom-2 left-0 w-full h-1 bg-primary/30 rounded-full" />
            </span>
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-foreground-muted">
            Bizly is the modern multi-tenant architecture designed to scale your operations,
            streamline scheduling, and securely manage your clients without the complexity.
          </p>

          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/register"
              className="group flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all duration-300 hover:-translate-y-1 hover:bg-primary-hover hover:shadow-primary/40 active:scale-95"
            >
              Get Started for free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1.5" />
            </Link>

            <Link
              href="/login"
              className="group flex items-center gap-2 text-sm font-semibold leading-6 text-foreground transition-all duration-300 hover:text-primary"
            >
              Live demo
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </section>

        {/* features section */}
        <section className="border-t border-border/50 bg-surface/50 py-24 sm:py-32 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">

            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-sm font-bold uppercase tracking-widest text-primary">Deploy faster</h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Everything you need to scale
              </p>
            </div>

            <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
              <div className="grid max-w-xl grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-3">

                {/* feature card */}
                <div className="group flex flex-col rounded-3xl border border-transparent bg-transparent p-8 transition-all duration-300 hover:border-border hover:bg-surface hover:shadow-xl hover:-translate-y-1">

                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <Users className="h-7 w-7 text-primary transition-transform duration-300 group-hover:scale-110" />
                  </div>

                  <h3 className="text-xl font-semibold leading-7 text-foreground">Multi-Tenant CRM</h3>

                  <p className="mt-3 flex-auto text-base leading-7 text-foreground-muted">
                    Isolate your clients' data securely. Every company gets its own workspace, dashboard, and customized environment.
                  </p>
                </div>

                <div className="group flex flex-col rounded-3xl border border-transparent bg-transparent p-8 transition-all duration-300 hover:border-border hover:bg-surface hover:shadow-xl hover:-translate-y-1">

                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <Calendar className="h-7 w-7 text-primary transition-transform duration-300 group-hover:scale-110" />
                  </div>

                  <h3 className="text-xl font-semibold leading-7 text-foreground">Smart Scheduling</h3>

                  <p className="mt-3 flex-auto text-base leading-7 text-foreground-muted">
                    Automate your calendar, prevent double bookings, and let your clients schedule appointments seamlessly.
                  </p>
                </div>

                <div className="group flex flex-col rounded-3xl border border-transparent bg-transparent p-8 transition-all duration-300 hover:border-border hover:bg-surface hover:shadow-xl hover:-translate-y-1">

                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <ShieldCheck className="h-7 w-7 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3" />
                  </div>

                  <h3 className="text-xl font-semibold leading-7 text-foreground">Enterprise Security</h3>

                  <p className="mt-3 flex-auto text-base leading-7 text-foreground-muted">
                    Built with HttpOnly cookies, JWT sessions, and rigorous permission controls out of the box.
                  </p>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* how it works section */}
        <section className="border-t border-border bg-background py-24 sm:py-32 relative overflow-hidden">
          <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">

            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                How it works
              </h2>

              <p className="mt-6 text-lg leading-8 text-foreground-muted">
                Get your operation up and running in minutes, not days.
              </p>
            </div>

            <div className="mx-auto mt-20 max-w-2xl lg:max-w-none relative">
              {/* connecting line for desktop */}
              <div className="hidden lg:block absolute top-10 left-1/6 right-1/6 h-0.5 bg-linear-to-r from-transparent via-primary/30 to-transparent" />

              <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3 relative">
                <div className="group flex flex-col items-center text-center">

                  <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-surface border border-border shadow-md transition-all duration-500 group-hover:border-primary/50 group-hover:shadow-primary/20 z-10">
                    <UserPlus className="h-8 w-8 text-foreground-muted transition-colors duration-300 group-hover:text-primary" />
                  </div>

                  <dt className="text-xl font-bold leading-7 text-foreground">1. Create an account</dt>

                  <dd className="mt-3 flex-auto text-base leading-7 text-foreground-muted px-4">
                    Sign up and register your tenant. We'll automatically provision a secure database schema just for your company.
                  </dd>
                </div>

                <div className="group flex flex-col items-center text-center">
                  <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-surface border border-border shadow-md transition-all duration-500 group-hover:border-primary/50 group-hover:shadow-primary/20 z-10">
                    <Settings className="h-8 w-8 text-foreground-muted transition-colors duration-300 group-hover:text-primary" />
                  </div>

                  <dt className="text-xl font-bold leading-7 text-foreground">2. Customize dashboard</dt>

                  <dd className="mt-3 flex-auto text-base leading-7 text-foreground-muted px-4">
                    Set up your working hours, add your team members, and define your service offerings in our intuitive panel.
                  </dd>
                </div>

                <div className="group flex flex-col items-center text-center">
                  <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-surface border border-border shadow-md transition-all duration-500 group-hover:border-primary/50 group-hover:shadow-primary/20 z-10">
                    <Rocket className="h-8 w-8 text-foreground-muted transition-colors duration-300 group-hover:text-primary" />
                  </div>

                  <dt className="text-xl font-bold leading-7 text-foreground">3. Start growing</dt>

                  <dd className="mt-3 flex-auto text-base leading-7 text-foreground-muted px-4">
                    Share your unique booking link with clients. We handle the scheduling, reminders, and data management.
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        {/* pricing section - leverage strategy */}
        <section className="border-t border-border bg-surface py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">

            <div className="mx-auto max-w-2xl sm:text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Simple, transparent pricing</h2>

              <p className="mt-6 text-lg leading-8 text-foreground-muted">
                No hidden fees. Choose the plan that perfectly fits your growth stage.
              </p>
            </div>

            <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-y-6 sm:mt-20 lg:max-w-none lg:grid-cols-3 lg:gap-x-8">

              {/* starter plan */}
              <div className="group rounded-3xl border border-border bg-background p-8 sm:p-10 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:border-primary/30 flex flex-col">
                <h3 className="text-lg font-semibold leading-8 text-foreground">Starter</h3>

                <div className="mt-4 flex items-baseline text-5xl font-bold tracking-tight text-foreground">
                  $0
                  <span className="text-lg font-semibold leading-8 tracking-normal text-foreground-muted">/mo</span>
                </div>

                <p className="mt-6 text-base leading-7 text-foreground-muted">
                  Perfect for freelancers testing the waters.
                </p>

                <ul className="mt-8 space-y-4 text-sm leading-6 text-foreground-muted flex-1">
                  <li className="flex gap-x-3 items-center">
                    <CheckCircle2 className="h-5 w-5 flex-none text-primary/70" />
                    Up to 50 clients
                  </li>

                  <li className="flex gap-x-3 items-center">
                    <CheckCircle2 className="h-5 w-5 flex-none text-primary/70" />
                    Basic scheduling
                  </li>

                  <li className="flex gap-x-3 items-center">
                    <CheckCircle2 className="h-5 w-5 flex-none text-primary/70" />
                    Community support
                  </li>

                  <li className="flex gap-x-3 items-center text-foreground-muted/50">
                    <X className="h-5 w-5 flex-none" />
                    Multi-tenant administration
                  </li>

                  <li className="flex gap-x-3 items-center text-foreground-muted/50">
                    <X className="h-5 w-5 flex-none" />
                    Custom domain
                  </li>

                  <li className="flex gap-x-3 items-center text-foreground-muted/50">
                    <X className="h-5 w-5 flex-none" />
                    API access
                  </li>
                </ul>

                <Link
                  href="/register"
                  className="mt-8 block w-full rounded-xl border border-border px-3 py-4 text-center text-sm font-semibold text-foreground transition-all duration-300 hover:border-primary hover:text-primary hover:bg-primary/5 active:scale-95"
                >
                  Get started
                </Link>
              </div>

              {/* pro plan - the target */}
              <div className="group rounded-3xl border border-primary bg-background p-8 shadow-xl shadow-primary/10 sm:p-10 relative transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/20 flex flex-col">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-sm">
                  Most popular
                </div>

                <h3 className="text-lg font-semibold leading-8 text-primary">Professional</h3>

                <div className="mt-4 flex items-baseline text-5xl font-bold tracking-tight text-foreground">
                  $49
                  <span className="text-lg font-semibold leading-8 tracking-normal text-foreground-muted">/mo</span>
                </div>

                <p className="mt-6 text-base leading-7 text-foreground-muted">
                  The complete toolkit for growing businesses.
                </p>

                <ul className="mt-8 space-y-4 text-sm leading-6 text-foreground-muted flex-1">
                  <li className="flex gap-x-3 items-center">
                    <CheckCircle2 className="h-5 w-5 flex-none text-primary" />
                    Unlimited clients
                  </li>

                  <li className="flex gap-x-3 items-center">
                    <CheckCircle2 className="h-5 w-5 flex-none text-primary" />
                    Smart automations
                  </li>

                  <li className="flex gap-x-3 items-center">
                    <CheckCircle2 className="h-5 w-5 flex-none text-primary" />
                    Priority email support
                  </li>

                  <li className="flex gap-x-3 items-center">
                    <CheckCircle2 className="h-5 w-5 flex-none text-primary" />
                    Multi-tenant administration
                  </li>

                  <li className="flex gap-x-3 items-center">
                    <CheckCircle2 className="h-5 w-5 flex-none text-primary" />
                    Custom domain
                  </li>

                  <li className="flex gap-x-3 items-center text-foreground-muted/50">
                    <X className="h-5 w-5 flex-none" />API access
                  </li>
                </ul>

                <Link
                  href="/register"
                  className="mt-8 block w-full rounded-xl bg-primary px-3 py-4 text-center text-sm font-semibold text-white transition-all duration-300 hover:bg-primary-hover active:scale-95"
                >
                  Start free trial
                </Link>
              </div>

              {/* business plan - the anchor/decoy */}
              <div className="group rounded-3xl border border-border bg-background p-8 sm:p-10 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:border-primary/30 flex flex-col">
                <h3 className="text-lg font-semibold leading-8 text-foreground">Business</h3>

                <div className="mt-4 flex items-baseline text-5xl font-bold tracking-tight text-foreground">
                  $99
                  <span className="text-lg font-semibold leading-8 tracking-normal text-foreground-muted">/mo</span>
                </div>

                <p className="mt-6 text-base leading-7 text-foreground-muted">
                  Advanced controls for agencies and large teams.
                </p>

                <ul className="mt-8 space-y-4 text-sm leading-6 text-foreground-muted flex-1">
                  <li
                    className="flex gap-x-3 items-center"
                  >
                    <CheckCircle2 className="h-5 w-5 flex-none text-primary/70" /> Unlimited everything
                  </li>

                  <li
                    className="flex gap-x-3 items-center">
                    <CheckCircle2 className="h-5 w-5 flex-none text-primary/70" />
                    White-label reporting
                  </li>

                  <li className="flex gap-x-3 items-center">
                    <CheckCircle2 className="h-5 w-5 flex-none text-primary/70" />
                    24/7 Phone support
                  </li>

                  <li className="flex gap-x-3 items-center">
                    <CheckCircle2 className="h-5 w-5 flex-none text-primary/70" />
                    Dedicated account manager
                  </li>

                  <li className="flex gap-x-3 items-center">
                    <CheckCircle2 className="h-5 w-5 flex-none text-primary/70" />
                    Custom domain
                  </li>

                  <li className="flex gap-x-3 items-center">
                    <CheckCircle2 className="h-5 w-5 flex-none text-primary/70" />
                    Full API access
                  </li>
                </ul>

                <Link
                  href="/register"
                  className="mt-8 block w-full rounded-xl border border-border px-3 py-4 text-center text-sm font-semibold text-foreground transition-all duration-300 hover:border-primary hover:text-primary hover:bg-primary/5 active:scale-95"
                >
                  Contact sales
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* interactive faq section */}
        <section className="border-t border-border bg-background py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">

            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Frequently asked questions
              </h2>
            </div>

            <div className="mx-auto mt-16 max-w-2xl space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  onClick={() => toggleFaq(index)}
                  className={`group rounded-2xl border transition-all cursor-pointer overflow-hidden ${openFaq === index
                    ? 'border-primary/50 bg-surface shadow-md'
                    : 'border-border bg-surface/50 hover:border-primary/30 hover:bg-surface'
                    }`}
                >
                  <div className="p-6">
                    <h3 className="text-lg font-semibold leading-7 text-foreground transition-colors group-hover:text-primary flex justify-between items-center select-none">
                      {faq.question}
                      <ChevronRight className={`h-5 w-5 text-foreground-muted transition-transform duration-300 ${openFaq === index ? 'rotate-90 text-primary' : 'group-hover:translate-x-1'}`} />
                    </h3>

                    {/* expandable answer */}
                    <div
                      className={`grid transition-all duration-300 ease-in-out ${openFaq === index ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'
                        }`}
                    >
                      <div className="overflow-hidden">
                        <p className="text-base leading-7 text-foreground-muted">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

            </div>
          </div>
        </section>

        {/* final cta section */}
        <section className="bg-surface py-24 border-t border-border relative overflow-hidden">
          {/* background decorative element */}
          <div className="absolute inset-x-0 bottom-0 -z-10 transform-gpu overflow-hidden blur-3xl" aria-hidden="true">
            <div className="relative left-1/2 aspect-1155/678 w-144.5 -translate-x-1/2 bg-linear-to-tr from-primary to-primary/20 opacity-20" />
          </div>

          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-10 rounded-3xl bg-background border border-border p-8 sm:p-16 lg:flex-row lg:p-20 shadow-2xl">

              <div className="max-w-xl text-center lg:text-left">
                <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Ready to upgrade your workflow?
                </h2>
                <p className="mt-4 text-lg leading-8 text-foreground-muted">
                  Join thousands of businesses that trust Bizly to manage their daily operations.
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-x-6">
                <Link
                  href="/register"
                  className="group rounded-xl bg-primary px-8 py-4 text-base font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-primary-hover hover:shadow-primary/40 active:scale-95"
                >
                  Create free account
                </Link>
              </div>

            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div >
  )
}
