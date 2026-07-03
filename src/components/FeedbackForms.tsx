import { useState } from 'react';
import { cn } from './ui/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { CheckCircle2, Loader2 } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────

type FieldType = 'text' | 'email' | 'rating5' | 'rating10' | 'radio' | 'checkbox' | 'textarea';

interface Question {
  id: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

interface FormSection {
  title: string;
  questions: Question[];
}

interface FormConfig {
  id: string;
  label: string;
  icon: string;
  emailSubject: string;
  intro: string;
  sections: FormSection[];
}

type FormData = Record<string, string | string[]>;

// ── Form configs ───────────────────────────────────────────────────────────

const TUTOR_FORM: FormConfig = {
  id: 'tutor',
  label: 'Tutor',
  icon: '🎓',
  emailSubject: 'Knowledge Fons Academy Beta — Tutor Feedback',
  intro:
    'Thank you for taking part in our beta testing programme. Your honest feedback helps us build the best possible experience for tutors like you. All responses are confidential. Estimated time: 5–8 minutes.',
  sections: [
    {
      title: 'Section 1: Basic Information',
      questions: [
        { id: 'tutor_name', label: 'Tutor Name', type: 'text', placeholder: 'Your full name' },
        { id: 'email', label: 'Email Address (optional — for follow-up)', type: 'email', placeholder: 'your@email.com' },
        { id: 'subjects_taught', label: 'Subjects Taught', type: 'text', placeholder: 'e.g. Maths, English, Science' },
        { id: 'years_experience', label: 'Years of Teaching Experience', type: 'radio', options: ['0–1 yr', '2–4 yrs', '5–9 yrs', '10+ yrs'], required: true },
        { id: 'experience_level', label: 'Teaching Experience Level', type: 'radio', options: ['Beginner', 'Intermediate', 'Experienced', 'Professional Teacher'], required: true },
        { id: 'taught_online', label: 'Have you taught online before?', type: 'radio', options: ['Yes', 'No', 'Occasionally'], required: true },
      ],
    },
    {
      title: 'Section 2: Registration & Onboarding',
      questions: [
        { id: 'reg_ease', label: 'How easy was the tutor registration process?', type: 'rating5', required: true },
        { id: 'profile_clear', label: 'Was the profile setup process clear and straightforward?', type: 'radio', options: ['Yes', 'Somewhat', 'No'], required: true },
        { id: 'doc_upload', label: 'Was uploading qualifications and documents easy?', type: 'radio', options: ['Yes', 'Somewhat', 'No'], required: true },
        { id: 'booking_understand', label: 'Did you understand how lesson bookings work?', type: 'radio', options: ['Yes', 'Mostly', 'No'], required: true },
        { id: 'payment_understand', label: 'Did you understand how payments and earnings work?', type: 'radio', options: ['Yes', 'Mostly', 'No'], required: true },
        { id: 'comms_understand', label: 'Did you understand the student communication features?', type: 'radio', options: ['Yes', 'Mostly', 'No'], required: true },
        { id: 'onboarding_rating', label: 'How satisfied are you with the onboarding guidance overall?', type: 'rating5', required: true },
        { id: 'confusing_onboarding', label: 'What was the most confusing part of onboarding?', type: 'textarea', placeholder: 'Tell us what was unclear...' },
      ],
    },
    {
      title: 'Section 3: Tutor Dashboard Experience',
      questions: [
        { id: 'dashboard_nav', label: 'Dashboard navigation experience', type: 'rating5', required: true },
        { id: 'calendar_setup', label: 'Calendar / availability setup', type: 'rating5', required: true },
        { id: 'messaging_exp', label: 'Messaging and communication tools', type: 'rating5', required: true },
        { id: 'lesson_mgmt', label: 'Lesson management experience', type: 'rating5', required: true },
        { id: 'student_visibility', label: 'Student visibility and management', type: 'rating5', required: true },
        { id: 'lesson_tools', label: 'Lesson delivery tools (whiteboard, video, audio)', type: 'rating5', required: true },
        { id: 'payment_dashboard', label: 'Clarity of payment / earnings dashboard', type: 'rating5', required: true },
        { id: 'professional_feel', label: 'Did the platform feel professional enough to teach on?', type: 'radio', options: ['Yes', 'Somewhat', 'No'], required: true },
        { id: 'dashboard_improve', label: 'What would make the dashboard more tutor-friendly?', type: 'textarea', placeholder: 'Your suggestions...' },
      ],
    },
    {
      title: 'Section 4: Technical Feedback',
      questions: [
        { id: 'had_issues', label: 'Did you experience any technical issues?', type: 'radio', options: ['Yes', 'No'], required: true },
        {
          id: 'issue_areas', label: 'If yes, which areas had issues? (select all that apply)', type: 'checkbox',
          options: ['Login / Account', 'Profile / Document Upload', 'Video / Audio', 'Calendar / Scheduling', 'Messaging', 'Payments', 'Page loading / Crashes', 'Other'],
        },
        { id: 'issue_detail', label: 'Please describe the issue(s) in detail', type: 'textarea', placeholder: 'Describe any problems you encountered...' },
        { id: 'stability_rating', label: 'Overall platform stability rating', type: 'rating5', required: true },
      ],
    },
    {
      title: 'Section 5: Final Feedback',
      questions: [
        { id: 'overall_satisfaction', label: 'Overall, how satisfied are you with your Knowledge Fons Academy experience?', type: 'radio', options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied'], required: true },
        { id: 'nps', label: 'How likely are you to recommend Knowledge Fons Academy to a colleague?\n(0 = Not at all likely   |   10 = Extremely likely)', type: 'rating10', required: true },
        { id: 'nps_reason', label: 'What is the main reason for your score?', type: 'textarea', placeholder: 'Tell us more...' },
        { id: 'would_teach', label: 'Would you use Knowledge Fons Academy to teach after the official launch?', type: 'radio', options: ['Definitely', 'Probably', 'Maybe', 'No'], required: true },
        { id: 'top_feature', label: 'What one feature would most improve your experience?', type: 'textarea', placeholder: 'Your top feature request...' },
        { id: 'fix_before_launch', label: 'What is the most important issue we should fix before going live?', type: 'textarea', placeholder: 'Be as specific as possible...' },
        { id: 'follow_up', label: 'Would you be happy to join a follow-up discussion?', type: 'radio', options: ['Yes', 'No'], required: true },
      ],
    },
  ],
};

const STUDENT_FORM: FormConfig = {
  id: 'student',
  label: 'Student',
  icon: '📚',
  emailSubject: 'Knowledge Fons Academy Beta — Student Feedback',
  intro:
    "Hi! We'd love to know what you think about Knowledge Fons Academy. There are no right or wrong answers — just tell us honestly what you thought. Estimated time: 3–5 minutes.",
  sections: [
    {
      title: 'Section 1: About You',
      questions: [
        { id: 'student_name', label: 'First Name or Nickname (optional)', type: 'text', placeholder: 'What can we call you?' },
        { id: 'age_group', label: 'Age Group', type: 'radio', options: ['Under 8', '9–12', '13–16', '17–20', '21+'], required: true },
        { id: 'grade', label: 'School Year / Grade (optional)', type: 'text', placeholder: 'e.g. Year 7, Grade 10' },
        { id: 'subjects', label: 'Subject(s) you explored on Knowledge Fons Academy', type: 'text', placeholder: 'e.g. Maths, English' },
        { id: 'device', label: 'Device used during testing', type: 'radio', options: ['Phone', 'Tablet', 'Laptop', 'Desktop'], required: true },
      ],
    },
    {
      title: 'Section 2: Platform Experience',
      questions: [
        { id: 'platform_easy', label: 'How easy was the platform to use overall?', type: 'radio', options: ['Very Easy', 'Easy', 'Difficult', 'Very Difficult'], required: true },
        { id: 'enjoyed', label: 'Did you enjoy using Knowledge Fons Academy?', type: 'radio', options: ['Yes', 'A Little', 'No'], required: true },
        { id: 'book_lesson', label: 'Could you easily find and book a lesson?', type: 'radio', options: ['Yes', 'Mostly', 'No'] },
        { id: 'join_lesson', label: 'Could you easily join a lesson when it started?', type: 'radio', options: ['Yes', 'No', "Didn't try"] },
        { id: 'message_tutor', label: 'Could you easily message your tutor?', type: 'radio', options: ['Yes', 'No', "Didn't try"] },
        { id: 'find_resources', label: 'Could you easily find homework or learning resources?', type: 'radio', options: ['Yes', 'No', "Didn't try"] },
        { id: 'navigate_pages', label: 'Could you navigate between pages without getting lost?', type: 'radio', options: ['Yes', 'Mostly', 'No'] },
        { id: 'instruction_clarity', label: 'How clear were the instructions on each page?', type: 'radio', options: ['Very Clear', 'Clear', 'Unclear', 'Very Unclear'] },
      ],
    },
    {
      title: 'Section 3: Lesson & Tutor Experience',
      questions: [
        { id: 'tutor_helpful', label: 'How helpful was your tutor during the session?', type: 'radio', options: ['Very Helpful', 'Helpful', 'Not Very Helpful', "Didn't have a session"] },
        { id: 'explanation_clarity', label: 'How clear were the explanations during your lesson?', type: 'radio', options: ['Very Clear', 'Clear', 'Unclear', 'N/A'] },
        { id: 'av_quality', label: 'How was the audio and video quality?', type: 'radio', options: ['Excellent', 'Good', 'Fair', 'Poor', 'N/A'] },
        { id: 'ask_questions', label: 'Did you feel comfortable asking questions during the lesson?', type: 'radio', options: ['Yes', 'Mostly', 'No', 'N/A'] },
        { id: 'lesson_rating', label: 'Overall lesson experience rating', type: 'rating5' },
      ],
    },
    {
      title: 'Section 4: Design & Feel',
      questions: [
        { id: 'liked_most', label: 'What did you like most about the platform?', type: 'textarea', placeholder: 'Tell us what you loved...' },
        { id: 'hard_to_find', label: 'What was hard to understand or find?', type: 'textarea', placeholder: 'Tell us what was confusing...' },
        { id: 'platform_feel', label: 'How did the platform feel? (select all that apply)', type: 'checkbox', options: ['Fun', 'Professional', 'Easy', 'Boring', 'Confusing'] },
        { id: 'design_rating', label: 'Design and look of the platform', type: 'rating5' },
      ],
    },
    {
      title: 'Section 5: Technical Issues',
      questions: [
        { id: 'had_issues', label: 'Did anything stop working or go wrong?', type: 'radio', options: ['Yes', 'No'] },
        {
          id: 'issue_type', label: 'If yes, what happened? (select all that apply)', type: 'checkbox',
          options: ["Page didn't load", 'Video / Audio problem', 'Could not log in', "Lesson didn't start", "Message didn't send", 'App crashed', 'Other'],
        },
        { id: 'issue_detail', label: 'Please tell us more about what went wrong', type: 'textarea', placeholder: 'Describe the problem...' },
        { id: 'page_load', label: 'Did pages generally load quickly?', type: 'radio', options: ['Yes', 'Sometimes', 'No'] },
      ],
    },
    {
      title: 'Section 6: Final Feedback',
      questions: [
        { id: 'overall_satisfaction', label: 'Overall, how satisfied are you with your Knowledge Fons Academy experience?', type: 'radio', options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied'], required: true },
        { id: 'nps', label: 'How likely are you to recommend Knowledge Fons Academy to a friend?\n(0 = Not at all   |   10 = Definitely)', type: 'rating10', required: true },
        { id: 'nps_reason', label: 'What is the main reason for your score?', type: 'textarea', placeholder: 'Tell us more...' },
        { id: 'would_use', label: 'Would you use Knowledge Fons Academy for your learning?', type: 'radio', options: ['Yes', 'Maybe', 'No'], required: true },
        { id: 'improvement', label: 'What one thing would make Knowledge Fons Academy better for students?', type: 'textarea', placeholder: 'Your top suggestion...' },
        { id: 'follow_up', label: 'Would you be happy to chat with us again about your experience?', type: 'radio', options: ['Yes', 'No'], required: true },
      ],
    },
  ],
};

const PARENT_FORM: FormConfig = {
  id: 'parent',
  label: 'Parent',
  icon: '👪',
  emailSubject: 'Knowledge Fons Academy Beta — Parent Feedback',
  intro:
    "Thank you for helping us test Knowledge Fons Academy. Your feedback as a parent is invaluable in making sure our platform is safe, easy to use, and genuinely helpful for your family. All responses are confidential. Estimated time: 5–8 minutes.",
  sections: [
    {
      title: 'Section 1: Basic Information',
      questions: [
        { id: 'parent_name', label: 'Parent Name (optional)', type: 'text', placeholder: 'Your name' },
        { id: 'email', label: 'Email Address (optional — for follow-up)', type: 'email', placeholder: 'your@email.com' },
        { id: 'child_age', label: "Child's Age", type: 'radio', options: ['Under 5', '5–8', '9–12', '13–16', '17–18', '18+ (adult learner)'], required: true },
        { id: 'subjects', label: 'Subjects interested in', type: 'text', placeholder: 'e.g. Maths, English, Science' },
        { id: 'device', label: 'Device used during testing', type: 'radio', options: ['Mobile', 'Tablet', 'Laptop', 'Desktop'], required: true },
        { id: 'heard_from', label: 'How did you hear about Knowledge Fons Academy?', type: 'radio', options: ['Social Media', 'Friend / Family', 'Search Engine', 'Email', 'Other'] },
      ],
    },
    {
      title: 'Section 2: First Impressions',
      questions: [
        { id: 'ease_of_use', label: 'How easy was the platform to use overall?', type: 'rating5', required: true },
        { id: 'visual_appeal', label: 'Was the platform visually appealing?', type: 'radio', options: ['Very Appealing', 'Appealing', 'Neutral', 'Needs Improvement'], required: true },
        { id: 'find_tutor', label: 'Did you understand how to find and choose a tutor?', type: 'radio', options: ['Yes', 'Mostly', 'No'], required: true },
        { id: 'booking_understand', label: 'Did you understand how lesson bookings work?', type: 'radio', options: ['Yes', 'Mostly', 'No'], required: true },
        { id: 'payment_understand', label: 'Did you understand how payments work?', type: 'radio', options: ['Yes', 'Mostly', 'No'], required: true },
        { id: 'contact_tutors', label: 'Did you understand how to contact tutors?', type: 'radio', options: ['Yes', 'Mostly', 'No'], required: true },
        { id: 'platform_safe', label: 'Did the platform feel safe and trustworthy for your child?', type: 'radio', options: ['Very Safe', 'Mostly Safe', 'Unsure', 'Not Safe'], required: true },
      ],
    },
    {
      title: 'Section 3: Parent Dashboard Experience',
      questions: [
        { id: 'account_creation', label: 'Ease of creating an account', type: 'rating5', required: true },
        { id: 'student_details', label: "Ease of adding your child's details", type: 'rating5', required: true },
        { id: 'search_tutors', label: 'Ease of searching for tutors', type: 'rating5', required: true },
        { id: 'book_lessons', label: 'Ease of booking lessons', type: 'rating5', required: true },
        { id: 'dashboard_nav', label: 'Ease of navigating the dashboard', type: 'rating5', required: true },
        { id: 'tutor_profiles', label: 'Quality of tutor profiles and credentials displayed', type: 'rating5', required: true },
        { id: 'payment_clarity', label: 'Payment and pricing clarity', type: 'rating5', required: true },
        { id: 'trust', label: 'Did you trust the platform?', type: 'radio', options: ['Completely', 'Mostly', 'Not Fully', 'No'], required: true },
        { id: 'trust_improve', label: 'What would increase your trust in the platform?', type: 'textarea', placeholder: 'Be as specific as possible...' },
        { id: 'confusing_areas', label: 'Were any areas confusing or unclear?', type: 'textarea', placeholder: 'Describe anything that was hard to understand...' },
      ],
    },
    {
      title: 'Section 4: Features & Safety',
      questions: [
        {
          id: 'liked_features', label: 'Which features did you like most? (select all that apply)', type: 'checkbox',
          options: ['Tutor profiles', 'Lesson booking system', 'Messaging / Chat', 'Payment system', 'Dashboard overview', 'Progress tracking', 'Resource library'],
        },
        { id: 'missing_features', label: 'Which features felt missing or incomplete?', type: 'textarea', placeholder: 'What did you wish was there?' },
        { id: 'vetting', label: 'Do the tutor vetting / credential checks feel sufficient?', type: 'radio', options: ['Yes, very thorough', 'Mostly', 'Could be stronger', 'No'] },
        { id: 'safety_missing', label: 'Are there any safety or privacy features you feel are missing?', type: 'textarea', placeholder: 'Your safety concerns...' },
        {
          id: 'issues_areas', label: 'Did you experience any issues during testing? (select all that apply)', type: 'checkbox',
          options: ['Login / Sign-up', 'Booking', 'Payment', 'Messaging', 'Dashboard loading', 'Video / Audio', 'None'],
        },
        { id: 'issue_detail', label: 'Please describe any issues you encountered', type: 'textarea', placeholder: 'Describe the problems...' },
      ],
    },
    {
      title: 'Section 5: Final Feedback',
      questions: [
        { id: 'overall_satisfaction', label: 'Overall, how satisfied are you with your Knowledge Fons Academy experience?', type: 'radio', options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied'], required: true },
        { id: 'nps', label: 'How likely are you to recommend Knowledge Fons Academy to another parent?\n(0 = Not at all likely   |   10 = Extremely likely)', type: 'rating10', required: true },
        { id: 'nps_reason', label: 'What is the main reason for your score?', type: 'textarea', placeholder: 'Tell us more...' },
        { id: 'would_use', label: 'Would you use Knowledge Fons Academy for your child?', type: 'radio', options: ['Definitely', 'Probably', 'Maybe', 'No'], required: true },
        { id: 'would_recommend', label: 'Would you recommend Knowledge Fons Academy to another parent?', type: 'radio', options: ['Yes', 'No'] },
        { id: 'top_improvement', label: 'What is the single most important improvement we should make?', type: 'textarea', placeholder: 'Your top priority...' },
        { id: 'follow_up', label: 'Would you be happy to join a follow-up discussion?', type: 'radio', options: ['Yes', 'No'], required: true },
      ],
    },
  ],
};

const ALL_FORMS = [TUTOR_FORM, STUDENT_FORM, PARENT_FORM];

// ── Helper: format submission body ─────────────────────────────────────────

function buildEmailBody(config: FormConfig, data: FormData): string {
  const lines: string[] = [`Form: ${config.label} Feedback`, `Submitted: ${new Date().toLocaleString()}`, ''];
  for (const section of config.sections) {
    lines.push(`── ${section.title} ──`);
    for (const q of section.questions) {
      const val = data[q.id];
      if (!val || (Array.isArray(val) && val.length === 0)) continue;
      const display = Array.isArray(val) ? val.join(', ') : val;
      lines.push(`${q.label.replace(/\n/g, ' ')}: ${display}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

// ── Sub-components ─────────────────────────────────────────────────────────

function RatingButtons({ max, value, onChange }: { max: number; value: string; onChange: (v: string) => void }) {
  const start = max === 10 ? 0 : 1;
  const nums = Array.from({ length: max - start + 1 }, (_, i) => i + start);
  return (
    <div className="flex flex-wrap gap-1.5">
      {nums.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(String(n))}
          className={cn(
            'h-9 w-9 rounded-lg border-2 text-sm font-semibold transition-all',
            value === String(n)
              ? 'border-[#625d9c] bg-[#625d9c] text-white'
              : 'border-gray-200 bg-white text-gray-600 hover:border-[#625d9c] hover:text-[#625d9c]',
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function RadioButtons({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            'rounded-lg border-2 px-3 py-1.5 text-sm font-medium transition-all',
            value === opt
              ? 'border-[#625d9c] bg-[#625d9c] text-white'
              : 'border-gray-200 bg-white text-gray-600 hover:border-[#625d9c] hover:text-[#625d9c]',
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function CheckboxGroup({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (opt: string) =>
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={cn(
            'rounded-lg border-2 px-3 py-1.5 text-sm font-medium transition-all',
            value.includes(opt)
              ? 'border-[#5d9827] bg-[#5d9827] text-white'
              : 'border-gray-200 bg-white text-gray-600 hover:border-[#5d9827] hover:text-[#5d9827]',
          )}
        >
          {value.includes(opt) ? '✓ ' : ''}{opt}
        </button>
      ))}
    </div>
  );
}

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: string | string[];
  onChange: (v: string | string[]) => void;
}) {
  const strVal = typeof value === 'string' ? value : '';
  const arrVal = Array.isArray(value) ? value : [];

  switch (question.type) {
    case 'text':
    case 'email':
      return (
        <Input
          type={question.type}
          value={strVal}
          placeholder={question.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="max-w-sm"
        />
      );
    case 'textarea':
      return (
        <Textarea
          value={strVal}
          placeholder={question.placeholder}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'rating5':
      return <RatingButtons max={5} value={strVal} onChange={onChange as (v: string) => void} />;
    case 'rating10':
      return <RatingButtons max={10} value={strVal} onChange={onChange as (v: string) => void} />;
    case 'radio':
      return <RadioButtons options={question.options!} value={strVal} onChange={onChange as (v: string) => void} />;
    case 'checkbox':
      return <CheckboxGroup options={question.options!} value={arrVal} onChange={onChange as (v: string[]) => void} />;
    default:
      return null;
  }
}

// ── Single form renderer ───────────────────────────────────────────────────

function FeedbackForm({ config }: { config: FormConfig }) {
  const [data, setData] = useState<FormData>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [missingFields, setMissingFields] = useState<Set<string>>(new Set());

  const set = (id: string, val: string | string[]) => {
    setData((prev) => ({ ...prev, [id]: val }));
    if (missingFields.has(id)) {
      setMissingFields((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  const validate = (): boolean => {
    const missing = new Set<string>();
    for (const section of config.sections) {
      for (const q of section.questions) {
        if (!q.required) continue;
        const val = data[q.id];
        if (!val || (typeof val === 'string' && !val.trim()) || (Array.isArray(val) && val.length === 0)) {
          missing.add(q.id);
        }
      }
    }
    setMissingFields(missing);
    return missing.size === 0;
  };

  const handleSubmit = async () => {
    setError('');
    if (!validate()) {
      setError('Please answer all required questions before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('https://formsubmit.co/ajax/afoma@knowledgefonsacademy.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: `${config.emailSubject} — ${new Date().toLocaleDateString()}`,
          _template: 'basic',
          _captcha: 'false',
          message: buildEmailBody(config, data),
        }),
      });
      if (!res.ok) throw new Error('Network error');
      setSubmitted(true);
    } catch {
      setError('Something went wrong sending your feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <CheckCircle2 className="h-14 w-14 text-[#5d9827]" />
        <h3 className="text-xl font-semibold text-gray-800">Thank you for your feedback!</h3>
        <p className="max-w-sm text-sm text-gray-500">
          Your responses have been sent to the Knowledge Fons Academy team. We really appreciate you taking the time.
        </p>
        <button
          className="mt-2 text-sm font-medium underline"
          style={{ color: '#625d9c' }}
          onClick={() => { setSubmitted(false); setData({}); }}
        >
          Submit another response
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="mb-6 text-sm text-gray-500 leading-relaxed">{config.intro}</p>

      {config.sections.map((section) => (
        <div key={section.title} className="mb-6">
          <div className="mb-3 rounded-lg px-3 py-2" style={{ backgroundColor: '#625d9c' }}>
            <h3 className="text-sm font-semibold text-white">{section.title}</h3>
          </div>
          <div className="space-y-5 px-1">
            {section.questions.map((q) => {
              const isMissing = missingFields.has(q.id);
              return (
                <div key={q.id}>
                  <label className={cn('mb-1.5 block text-sm font-medium', isMissing ? 'text-red-600' : 'text-gray-700')}>
                    {q.label.split('\n').map((line, i) => (
                      <span key={i} className="block">{line}</span>
                    ))}
                    {q.required && <span className="ml-1 text-red-500">*</span>}
                  </label>
                  <QuestionField
                    question={q}
                    value={data[q.id] ?? (q.type === 'checkbox' ? [] : '')}
                    onChange={(v) => set(q.id, v)}
                  />
                  {isMissing && <p className="mt-1 text-xs text-red-500">This field is required.</p>}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      <div className="pt-2">
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="h-11 w-full text-white sm:w-auto sm:min-w-40"
          style={{ backgroundColor: '#625d9c' }}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            'Submit Feedback'
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────

export function FeedbackForms() {
  const [activeTab, setActiveTab] = useState('tutor');
  const active = ALL_FORMS.find((f) => f.id === activeTab)!;

  return (
    <div className="rounded-3xl bg-white/95 shadow-2xl backdrop-blur-sm">
      {/* Header */}
      <div className="border-b border-gray-100 px-6 py-6 sm:px-10">
        <h2 className="text-2xl font-semibold text-gray-900">Share Your Feedback</h2>
        <p className="mt-1 text-sm text-gray-500">
          Help us improve Knowledge Fons Academy — select your role and complete the form below.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 border-b border-gray-100 px-6 sm:px-10 pt-4">
        {ALL_FORMS.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveTab(f.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-all',
              activeTab === f.id
                ? 'border-[#625d9c] text-[#625d9c]'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            <span>{f.icon}</span>
            {f.label}
          </button>
        ))}
      </div>

      {/* Active form */}
      <div className="px-6 py-6 sm:px-10">
        <FeedbackForm key={activeTab} config={active} />
      </div>
    </div>
  );
}
