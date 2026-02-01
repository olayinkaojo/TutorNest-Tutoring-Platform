import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Shield, 
  FileText, 
  Clock, 
  Download,
  Eye,
  Lock,
  Globe,
  Users
} from 'lucide-react';

interface PolicyVersion {
  version: string;
  effectiveDate: string;
  changes: string[];
  content: string;
}

const POLICY_VERSIONS: PolicyVersion[] = [
  {
    version: '2.0.0',
    effectiveDate: '2025-11-15',
    changes: [
      'Updated cookie policy with granular consent options',
      'Enhanced data subject rights information',
      'Added information about AI-powered features',
      'Clarified international data transfers'
    ],
    content: 'full-policy-v2'
  },
  {
    version: '1.0.0',
    effectiveDate: '2024-01-01',
    changes: [
      'Initial privacy policy release'
    ],
    content: 'full-policy-v1'
  }
];

export function PrivacyPolicy() {
  const [selectedVersion, setSelectedVersion] = useState(POLICY_VERSIONS[0].version);
  const currentVersion = POLICY_VERSIONS.find(v => v.version === selectedVersion) || POLICY_VERSIONS[0];

  const downloadPolicy = () => {
    const element = document.createElement('a');
    const content = document.getElementById('policy-content')?.innerText || '';
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `TutorNest-Privacy-Policy-v${selectedVersion}.txt`;
    element.click();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl mb-4">Privacy Policy</h1>
        <div className="flex items-center justify-center gap-4 text-gray-600">
          <Badge variant="outline" className="text-base">
            Version {currentVersion.version}
          </Badge>
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Effective: {new Date(currentVersion.effectiveDate).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </span>
        </div>
      </div>

      {/* Version Selector & Actions */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <FileText className="w-5 h-5 text-[#625d9c]" />
            <Select value={selectedVersion} onValueChange={setSelectedVersion}>
              <SelectTrigger className="w-full md:w-[250px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POLICY_VERSIONS.map((version) => (
                  <SelectItem key={version.version} value={version.version}>
                    Version {version.version} - {new Date(version.effectiveDate).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={downloadPolicy}>
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>

        {currentVersion.changes.length > 1 && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900 mb-2">What's new in this version:</p>
            <ul className="text-sm text-blue-800 space-y-1">
              {currentVersion.changes.map((change, index) => (
                <li key={index}>• {change}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Policy Content */}
      <div id="policy-content" className="space-y-6">
        {/* Introduction */}
        <Card className="p-6">
          <h2 className="text-2xl mb-4">Introduction</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            TutorNest ("we", "our", "us") is committed to protecting your privacy and ensuring the security
            of your personal information. This Privacy Policy explains how we collect, use, disclose, and
            safeguard your information when you use our online tutoring platform.
          </p>
          <p className="text-gray-700 leading-relaxed">
            This policy complies with the UK General Data Protection Regulation (UK GDPR), the Data Protection
            Act 2018, and other applicable data protection laws.
          </p>
        </Card>

        {/* Data Controller */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-6 h-6 text-[#625d9c]" />
            <h2 className="text-2xl">Data Controller</h2>
          </div>
          <div className="text-gray-700 space-y-2">
            <p><strong>Company Name:</strong> TutorNest Ltd</p>
            <p><strong>Registered Address:</strong> 123 Education Street, London, EC1A 1BB, United Kingdom</p>
            <p><strong>ICO Registration:</strong> ZA123456</p>
            <p><strong>Data Protection Officer:</strong> dpo@tutornest.com</p>
            <p><strong>Contact:</strong> privacy@tutornest.com | +44 (0)20 1234 5678</p>
          </div>
        </Card>

        {/* Information We Collect */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Eye className="w-6 h-6 text-[#625d9c]" />
            <h2 className="text-2xl">Information We Collect</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">1. Information You Provide</h3>
              <ul className="text-gray-700 space-y-2 ml-4">
                <li><strong>Account Information:</strong> Name, email address, password, phone number, profile photo</li>
                <li><strong>Profile Information:</strong> Educational background, qualifications, teaching experience (tutors)</li>
                <li><strong>Child Information:</strong> Names, ages, educational level, learning preferences, special educational needs (parents)</li>
                <li><strong>Payment Information:</strong> Billing address, payment method details (processed securely via Stripe)</li>
                <li><strong>Communications:</strong> Messages, session notes, support requests, feedback</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">2. Information We Collect Automatically</h3>
              <ul className="text-gray-700 space-y-2 ml-4">
                <li><strong>Usage Data:</strong> Pages visited, features used, time spent, session recordings</li>
                <li><strong>Device Information:</strong> IP address, browser type, operating system, device identifiers</li>
                <li><strong>Location Data:</strong> Approximate location based on IP address</li>
                <li><strong>Cookies:</strong> See our Cookie Policy for detailed information</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">3. Information from Third Parties</h3>
              <ul className="text-gray-700 space-y-2 ml-4">
                <li><strong>Identity Verification:</strong> DBS check results, qualification verification</li>
                <li><strong>Payment Processors:</strong> Transaction status, payment disputes</li>
                <li><strong>Analytics Providers:</strong> Aggregated usage statistics</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* How We Use Your Information */}
        <Card className="p-6">
          <h2 className="text-2xl mb-4">How We Use Your Information</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Legal Basis for Processing</h3>
              <p className="text-gray-700 mb-3">
                We process your personal data under the following legal bases:
              </p>
              <ul className="text-gray-700 space-y-2 ml-4">
                <li><strong>Contract Performance:</strong> To provide tutoring services and process payments</li>
                <li><strong>Legitimate Interests:</strong> To improve our services, prevent fraud, ensure platform security</li>
                <li><strong>Legal Obligation:</strong> To comply with safeguarding requirements, tax obligations, legal requests</li>
                <li><strong>Consent:</strong> For marketing communications, non-essential cookies, special category data</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Purposes</h3>
              <ul className="text-gray-700 space-y-2 ml-4">
                <li>• Facilitating tutoring sessions and matching tutors with students</li>
                <li>• Processing payments and managing subscriptions</li>
                <li>• Communicating about your account and sessions</li>
                <li>• Personalizing learning experiences and recommendations</li>
                <li>• Improving platform functionality and user experience</li>
                <li>• Ensuring child safety and safeguarding compliance</li>
                <li>• Preventing fraud and unauthorized access</li>
                <li>• Complying with legal and regulatory requirements</li>
                <li>• Sending marketing communications (with your consent)</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Data Sharing */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6 text-[#625d9c]" />
            <h2 className="text-2xl">How We Share Your Information</h2>
          </div>
          
          <p className="text-gray-700 mb-4">
            We do not sell your personal information. We share your data only in the following circumstances:
          </p>
          
          <ul className="text-gray-700 space-y-3 ml-4">
            <li>
              <strong>Within the Platform:</strong> Parent and student profiles are visible to matched tutors;
              tutor profiles are visible to parents during search
            </li>
            <li>
              <strong>Service Providers:</strong> Payment processors (Stripe), video conferencing (Zoom),
              email services (SendGrid), analytics (Google Analytics)
            </li>
            <li>
              <strong>Legal Requirements:</strong> Law enforcement, regulators, courts when legally required
            </li>
            <li>
              <strong>Safeguarding:</strong> Local authorities, police, social services when child protection concerns arise
            </li>
            <li>
              <strong>Business Transfers:</strong> In case of merger, acquisition, or sale of assets
            </li>
          </ul>
        </Card>

        {/* International Transfers */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-6 h-6 text-[#625d9c]" />
            <h2 className="text-2xl">International Data Transfers</h2>
          </div>
          
          <p className="text-gray-700 mb-4">
            Your data may be transferred to and processed in countries outside the UK and EEA. We ensure
            appropriate safeguards are in place:
          </p>
          
          <ul className="text-gray-700 space-y-2 ml-4">
            <li>• Adequacy decisions by the UK government or EU Commission</li>
            <li>• Standard Contractual Clauses (SCCs) approved by the ICO</li>
            <li>• Privacy Shield certification (for US-based processors)</li>
            <li>• Binding Corporate Rules for multinational companies</li>
          </ul>
          
          <p className="text-gray-700 mt-4">
            <strong>Current international processors:</strong> Stripe (USA - Privacy Shield), Google Analytics
            (USA - SCCs), AWS (Frankfurt, Germany - EEA)
          </p>
        </Card>

        {/* Data Retention */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-6 h-6 text-[#625d9c]" />
            <h2 className="text-2xl">Data Retention</h2>
          </div>
          
          <p className="text-gray-700 mb-4">
            We retain your personal data only as long as necessary:
          </p>
          
          <ul className="text-gray-700 space-y-2 ml-4">
            <li><strong>Active accounts:</strong> Duration of account + 12 months</li>
            <li><strong>Session recordings:</strong> 7-90 days (depending on subscription tier)</li>
            <li><strong>Payment records:</strong> 7 years (tax and accounting requirements)</li>
            <li><strong>Dispute records:</strong> 6 years (UK contract law limitation period)</li>
            <li><strong>Safeguarding records:</strong> Indefinite (child protection requirements)</li>
            <li><strong>Marketing consent:</strong> Until withdrawn or 2 years of inactivity</li>
          </ul>
          
          <p className="text-gray-700 mt-4">
            After retention periods expire, data is securely deleted or anonymized.
          </p>
        </Card>

        {/* Your Rights */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-6 h-6 text-[#625d9c]" />
            <h2 className="text-2xl">Your Data Protection Rights</h2>
          </div>
          
          <p className="text-gray-700 mb-4">
            Under UK GDPR, you have the following rights:
          </p>
          
          <ul className="text-gray-700 space-y-2 ml-4">
            <li><strong>Right to Access:</strong> Request a copy of your personal data</li>
            <li><strong>Right to Rectification:</strong> Correct inaccurate or incomplete data</li>
            <li><strong>Right to Erasure:</strong> Request deletion of your data</li>
            <li><strong>Right to Restrict Processing:</strong> Limit how we use your data</li>
            <li><strong>Right to Data Portability:</strong> Receive your data in a portable format</li>
            <li><strong>Right to Object:</strong> Object to processing based on legitimate interests</li>
            <li><strong>Rights Related to Automated Decision-Making:</strong> Request human review</li>
            <li><strong>Right to Withdraw Consent:</strong> Withdraw consent for processing</li>
            <li><strong>Right to Lodge a Complaint:</strong> Complain to the ICO</li>
          </ul>
          
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              To exercise your rights, visit our{' '}
              <a href="/data-subject-rights" className="underline hover:text-blue-700">
                Data Subject Rights page
              </a>
              {' '}or email{' '}
              <a href="mailto:dpo@tutornest.com" className="underline hover:text-blue-700">
                dpo@tutornest.com
              </a>
            </p>
          </div>
        </Card>

        {/* Security */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-6 h-6 text-[#625d9c]" />
            <h2 className="text-2xl">Security Measures</h2>
          </div>
          
          <p className="text-gray-700 mb-4">
            We implement industry-standard security measures to protect your data:
          </p>
          
          <ul className="text-gray-700 space-y-2 ml-4">
            <li>• SSL/TLS encryption for data in transit</li>
            <li>• AES-256 encryption for data at rest</li>
            <li>• Multi-factor authentication for account access</li>
            <li>• Role-based access control with least privilege principle</li>
            <li>• Regular security audits and penetration testing</li>
            <li>• Employee training on data protection</li>
            <li>• Incident response and breach notification procedures</li>
          </ul>
        </Card>

        {/* Children's Privacy */}
        <Card className="p-6 bg-amber-50 border-amber-200">
          <h2 className="text-2xl mb-4">Children's Privacy & Safeguarding</h2>
          
          <p className="text-gray-700 mb-4">
            TutorNest is a platform for children's education. We take special care to protect children's data:
          </p>
          
          <ul className="text-gray-700 space-y-2 ml-4">
            <li>• Parental consent required for children under 13</li>
            <li>• Parent/guardian controls over messaging and file sharing</li>
            <li>• All tutors undergo enhanced DBS checks</li>
            <li>• Safeguarding policies and procedures in place</li>
            <li>• Designated Safeguarding Lead available</li>
            <li>• Compliance with Keeping Children Safe in Education guidance</li>
          </ul>
          
          <p className="text-gray-700 mt-4">
            <strong>Safeguarding concerns:</strong> Contact our Safeguarding Lead at{' '}
            <a href="mailto:safeguarding@tutornest.com" className="text-[#625d9c] underline">
              safeguarding@tutornest.com
            </a>
            {' '}or call 0800 123 4567 (24/7)
          </p>
        </Card>

        {/* Contact */}
        <Card className="p-6">
          <h2 className="text-2xl mb-4">Contact Us</h2>
          
          <p className="text-gray-700 mb-4">
            If you have questions about this Privacy Policy or our data practices:
          </p>
          
          <div className="space-y-2 text-gray-700">
            <p><strong>Data Protection Officer:</strong> dpo@tutornest.com</p>
            <p><strong>Privacy Team:</strong> privacy@tutornest.com</p>
            <p><strong>Phone:</strong> +44 (0)20 1234 5678</p>
            <p><strong>Post:</strong> TutorNest Ltd, 123 Education Street, London, EC1A 1BB</p>
          </div>
          
          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Information Commissioner's Office (ICO):</strong><br />
              If you're unhappy with how we handle your data, you can complain to the ICO:<br />
              Website: <a href="https://ico.org.uk" className="text-[#625d9c] underline">ico.org.uk</a><br />
              Phone: 0303 123 1113
            </p>
          </div>
        </Card>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 pt-6 border-t">
        <p>
          This privacy policy was last updated on {new Date(currentVersion.effectiveDate).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })}
        </p>
        <p className="mt-2">
          © 2025 TutorNest Ltd. All rights reserved.
        </p>
      </div>
    </div>
  );
}
