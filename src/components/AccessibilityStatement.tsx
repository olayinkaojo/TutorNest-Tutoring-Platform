import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { 
  Eye, 
  Ear, 
  Keyboard, 
  Mail, 
  Phone,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export function AccessibilityStatement() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl mb-4">Accessibility Statement for Knowledge Fons Academy</h1>
        <p className="text-gray-600">
          Last updated: November 15, 2025
        </p>
      </div>

      <Card className="p-6">
        <h2 className="text-2xl mb-4">Our Commitment</h2>
        <p className="text-gray-700 leading-relaxed">
          Knowledge Fons Academy is committed to ensuring digital accessibility for all users, including those with disabilities.
          We are continually improving the user experience for everyone and applying the relevant accessibility standards
          to ensure we provide equal access to all of our users.
        </p>
      </Card>

      <Card className="p-6">
        <h2 className="text-2xl mb-4">Conformance Status</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-medium mb-2">WCAG 2.1 Level AA</h3>
              <p className="text-gray-700">
                Knowledge Fons Academy conforms to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA.
                The WCAG 2.1 guidelines explain how to make web content more accessible for people with disabilities,
                and user friendly for everyone.
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-900">
              <strong>Conformance achieved on core user flows:</strong>
            </p>
            <ul className="mt-2 space-y-1 text-sm text-green-900">
              <li>• Account sign-up and authentication</li>
              <li>• Tutor search and filtering</li>
              <li>• Booking and scheduling sessions</li>
              <li>• Live tutoring sessions</li>
              <li>• Profile management</li>
              <li>• Payment and subscription management</li>
            </ul>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-2xl mb-4">Accessibility Features</h2>
        
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Eye className="w-6 h-6 text-[#625d9c]" />
              <h3 className="text-lg font-medium">Visual Accessibility</h3>
            </div>
            <ul className="space-y-2 ml-9 text-gray-700">
              <li>• High contrast mode for improved readability</li>
              <li>• Adjustable text size (small, medium, large, extra-large)</li>
              <li>• Color blind modes (protanopia, deuteranopia, tritanopia)</li>
              <li>• Sufficient color contrast ratios (minimum 4.5:1 for normal text)</li>
              <li>• Text alternatives for all images and icons</li>
              <li>• Resizable text up to 200% without loss of content or functionality</li>
            </ul>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-3">
              <Ear className="w-6 h-6 text-[#625d9c]" />
              <h3 className="text-lg font-medium">Audio & Captions</h3>
            </div>
            <ul className="space-y-2 ml-9 text-gray-700">
              <li>• Closed captions available for all video sessions</li>
              <li>• Text-to-speech functionality for content</li>
              <li>• Visual indicators for audio alerts</li>
              <li>• Volume controls and audio preferences</li>
              <li>• Transcripts for recorded sessions</li>
            </ul>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-3">
              <Keyboard className="w-6 h-6 text-[#625d9c]" />
              <h3 className="text-lg font-medium">Keyboard & Navigation</h3>
            </div>
            <ul className="space-y-2 ml-9 text-gray-700">
              <li>• Full keyboard navigation support</li>
              <li>• Visible focus indicators</li>
              <li>• Skip navigation links</li>
              <li>• Consistent navigation structure</li>
              <li>• Keyboard shortcuts with hints</li>
              <li>• Logical tab order</li>
            </ul>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 className="w-6 h-6 text-[#625d9c]" />
              <h3 className="text-lg font-medium">Screen Reader Support</h3>
            </div>
            <ul className="space-y-2 ml-9 text-gray-700">
              <li>• Compatible with JAWS, NVDA, and VoiceOver</li>
              <li>• Semantic HTML structure</li>
              <li>• ARIA labels and landmarks</li>
              <li>• Descriptive link text</li>
              <li>• Form labels and error messages</li>
              <li>• Live regions for dynamic content updates</li>
            </ul>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-2xl mb-4">Special Educational Needs (SEN) Support</h2>
        <p className="text-gray-700 mb-4">
          We recognize that accessibility extends beyond technical compliance. Knowledge Fons Academy provides additional
          support for learners with special educational needs:
        </p>
        <ul className="space-y-2 text-gray-700">
          <li>• Learning preference profiles (pace, style, attention span)</li>
          <li>• SEN-experienced tutor matching</li>
          <li>• Customizable session durations and break schedules</li>
          <li>• Multiple learning style options (visual, auditory, kinesthetic)</li>
          <li>• Reduced motion options for users sensitive to animation</li>
          <li>• Flexible session formats adapted to individual needs</li>
        </ul>
      </Card>

      <Card className="p-6">
        <h2 className="text-2xl mb-4">Technologies We Support</h2>
        <p className="text-gray-700 mb-4">
          Knowledge Fons Academy is designed to be compatible with:
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-2">Screen Readers</h3>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>• JAWS (Windows)</li>
              <li>• NVDA (Windows)</li>
              <li>• VoiceOver (macOS, iOS)</li>
              <li>• TalkBack (Android)</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-2">Browsers</h3>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>• Chrome (latest 2 versions)</li>
              <li>• Firefox (latest 2 versions)</li>
              <li>• Safari (latest 2 versions)</li>
              <li>• Edge (latest 2 versions)</li>
            </ul>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-2xl mb-4">Known Limitations</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
            <div>
              <p className="text-gray-700 mb-3">
                While we strive for full accessibility, we are aware of the following limitations:
              </p>
              <ul className="space-y-2 text-gray-700">
                <li>• Some third-party video conferencing features may have limited accessibility</li>
                <li>• PDF documents uploaded by tutors may not always be fully accessible</li>
                <li>• Some complex interactive exercises may require additional assistive technology</li>
              </ul>
              <p className="text-gray-700 mt-3">
                We are actively working to address these issues and welcome your feedback.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-2xl mb-4">Assessment & Testing</h2>
        <p className="text-gray-700 mb-4">
          Knowledge Fons Academy has been assessed using:
        </p>
        <ul className="space-y-2 text-gray-700">
          <li>• Automated testing with axe DevTools and WAVE</li>
          <li>• Manual testing with keyboard navigation</li>
          <li>• Screen reader testing (JAWS, NVDA, VoiceOver)</li>
          <li>• User testing with individuals with disabilities</li>
          <li>• Regular accessibility audits by certified professionals</li>
        </ul>
      </Card>

      <Card className="p-6 bg-blue-50 border-blue-200">
        <h2 className="text-2xl mb-4">Feedback & Contact</h2>
        <p className="text-gray-700 mb-4">
          We welcome your feedback on the accessibility of Knowledge Fons Academy. Please let us know if you encounter
          accessibility barriers:
        </p>
        
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-[#625d9c] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Email</p>
              <a href="mailto:accessibility@knowledgefonsacademy.com" className="text-[#625d9c] hover:underline">
                accessibility@knowledgefonsacademy.com
              </a>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-[#625d9c] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Phone</p>
              <a href="tel:+442012345678" className="text-[#625d9c] hover:underline">
                +44 (0)20 1234 5678
              </a>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-gray-600">
              We aim to respond to accessibility feedback within 5 business days.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-2xl mb-4">Formal Complaints</h2>
        <p className="text-gray-700">
          If you are not satisfied with our response to your accessibility concerns, you may contact the
          Equality and Human Rights Commission (EHRC) or the Equality Commission for Northern Ireland (ECNI),
          depending on your location.
        </p>
      </Card>

      <div className="text-center pt-6">
        <p className="text-sm text-gray-600">
          This statement was created on November 15, 2025 and is reviewed regularly to reflect improvements to our platform.
        </p>
      </div>
    </div>
  );
}
