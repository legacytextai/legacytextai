import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
const Privacy = () => {
  return <Layout showSidebar={false}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Link to="/">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-legacy-primary mb-2">Privacy Policy</h1>
          <p className="text-legacy-ink/70">Last updated: September 12, 2025</p>
        </div>

        <div className="prose prose-lg max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-legacy-primary mb-4">Introduction</h2>
            <p className="text-legacy-ink/80 leading-relaxed">
              LegacyText AI ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our journaling service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-legacy-primary mb-4">Information We Collect</h2>
            <h3 className="text-xl font-medium text-legacy-ink mb-2">Personal Information</h3>
            <ul className="list-disc pl-6 text-legacy-ink/80 space-y-2">
              <li>Phone number for SMS functionality</li>
              <li>Email address for account creation and communication</li>
              <li>Journal entries and personal content you submit</li>
              <li>Payment information for premium services</li>
            </ul>
            
            <h3 className="text-xl font-medium text-legacy-ink mb-2 mt-4">Technical Information</h3>
            <ul className="list-disc pl-6 text-legacy-ink/80 space-y-2">
              <li>Device information and browser type</li>
              <li>IP address and location data</li>
              <li>Usage patterns and feature interactions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-legacy-primary mb-4">How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-legacy-ink/80 space-y-2">
              <li>Provide and maintain our journaling service</li>
              <li>Send SMS prompts and notifications</li>
              <li>Process payments for premium features</li>
              <li>Improve our AI categorization and organization features</li>
              <li>Communicate with you about service updates</li>
              <li>Ensure security and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-legacy-primary mb-4">Data Sharing and Disclosure</h2>
            <p className="text-legacy-ink/80 leading-relaxed mb-4">
              We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
            </p>
            <ul className="list-disc pl-6 text-legacy-ink/80 space-y-2">
              <li>With service providers who assist in operating our platform</li>
              <li>When required by law or legal process</li>
              <li>To protect our rights, property, or safety</li>
              <li>With your explicit consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-legacy-primary mb-4">Data Security</h2>
            <p className="text-legacy-ink/80 leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-legacy-primary mb-4">Your Rights</h2>
            <ul className="list-disc pl-6 text-legacy-ink/80 space-y-2">
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Opt-out of communications</li>
              <li>Data portability</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-legacy-primary mb-4">Contact Us</h2>
            <p className="text-legacy-ink/80 leading-relaxed">If you have questions about this Privacy Policy, please contact us at legacytextai@gmail.com</p>
          </section>
        </div>
      </div>
    </Layout>;
};
export default Privacy;