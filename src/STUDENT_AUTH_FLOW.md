# Student Authentication & Account Linking System

## Overview

TutorNest supports **three types of student accounts** to accommodate different age groups and payment scenarios:

1. **Parent-Managed Child Profiles** (Ages 5-12) - No separate login
2. **Parent-Initiated Student Accounts** (Ages 8-17) - Parent creates, student uses
3. **Independent Student Accounts** (Ages 18+) - Self-managed

---

## 🎯 Flow Diagrams

### **Flow 1: Parent Creates Child Profile & Enables Student Login**

```
Parent Signs Up
    ↓
Parent Creates Child Profile(s) in Dashboard
    ↓
Parent Clicks "Enable Student Login" Button
    ↓
System:
  - Generates student email (optional: parent provides custom)
  - Creates Supabase Auth user
  - Creates student user profile
  - Links to child profile
  - Generates temporary password
    ↓
Parent Receives Credentials:
  - Email: emma.smith.x4f2@student.tutornest.com
  - Password: Emma7x9f2k1!
    ↓
Parent Shares Credentials with Child
    ↓
Student Logs In → Student Dashboard
```

**Best For:** Young students (8-12) who need supervision

---

### **Flow 2: Teenager Initiates, Parent Approves & Pays**

```
Student (Age 13-17) Visits TutorNest
    ↓
Student Clicks "Sign Up as Student"
    ↓
Student Fills Form:
  - Email
  - Password
  - Name
  - Date of Birth
  - Parent Email (required for <18)
    ↓
System:
  - Creates student account (pending parent link)
  - Sends invitation to parent email
    ↓
Parent Receives Email:
  "Your child [Name] wants to join TutorNest"
  [Accept Link] button
    ↓
Parent Clicks Link → Redirected to Parent Dashboard
    ↓
IF parent has account:
  → Parent logs in → Sees pending request → Accepts
    ↓
IF parent doesn't have account:
  → Parent signs up → Account auto-linked → Accepts
    ↓
System:
  - Links student to parent
  - Creates child profile
  - Enables billing
    ↓
Student Gets Notification: "Account Linked! ✅"
    ↓
Student Can Now Book Sessions (Parent Pays)
```

**Best For:** Teenagers (13-17) who want autonomy but need parent to pay

---

### **Flow 3: Independent Adult Student**

```
Student (Age 18+) Visits TutorNest
    ↓
Student Clicks "Sign Up as Student"
    ↓
Student Fills Form:
  - Email
  - Password
  - Name
  - Date of Birth (18+ verified)
    ↓
System Asks: "Do you have a parent/guardian who will pay?"
    ↓
Student Selects "No, I'll manage my own billing"
    ↓
System:
  - Creates independent student account
  - No parent link required
  - Student manages own billing
    ↓
Student Logs In → Student Dashboard
    ↓
Student Books & Pays for Own Sessions
```

**Best For:** Adult learners (18+), university students, professionals

---

## 🔐 Database Schema

### **User Profile (Student)**
```javascript
{
  id: "user_student001",
  role: "student",
  email: "emma.student@tutornest.com",
  firstName: "Emma",
  lastName: "Smith",
  dateOfBirth: "2012-05-15",
  age: 12,
  
  // Account type flags
  isDependent: true,           // true if parent pays
  accountType: "student",      // "student" | "independent_student"
  
  // Parent linking
  linkedChildId: "child_001",  // Links to child profile
  linkedParentId: "user_parent123",
  parentEmail: "parent@example.com",
  
  // For dependent students awaiting parent approval
  awaitingParentLink: false,   // true if waiting for parent
  parentLinkToken: "link_abc123",
  
  // Metadata
  createdAt: "2024-11-15T10:00:00Z",
  createdBy: "user_parent123", // parentId if parent-created
  disabled: false              // Can be disabled by parent
}
```

### **Child Profile**
```javascript
{
  id: "child_001",
  parentId: "user_parent123",
  firstName: "Emma",
  lastName: "Smith",
  dateOfBirth: "2012-05-15",
  gradeLevel: "Year 7",
  subjects: ["Mathematics", "English"],
  
  // Student login info
  studentLoginEnabled: true,
  studentUserId: "user_student001",
  studentEmail: "emma.student@tutornest.com",
  studentLoginEnabledAt: "2024-11-15T10:00:00Z",
  
  // If student initiated signup
  linkedFromStudentSignup: false
}
```

### **Parent Link Request** (for Flow 2)
```javascript
{
  id: "parent-link-request:user_student001",
  studentId: "user_student001",
  studentName: "Jake Williams",
  studentEmail: "jake@example.com",
  parentEmail: "parent@example.com",
  linkToken: "link_xyz789",
  status: "pending", // "pending" | "accepted" | "rejected"
  createdAt: "2024-11-15T10:00:00Z",
  expiresAt: "2024-11-22T10:00:00Z" // 7 days
}
```

---

## 📡 API Endpoints

### **1. Enable Student Login (Parent-Initiated)**
```http
POST /make-server-cbd74580/student-auth/enable-login
Authorization: Bearer {parent_access_token}

Request Body:
{
  "childId": "child_001",
  "studentEmail": "emma@example.com",  // optional
  "generatePassword": true
}

Response:
{
  "success": true,
  "studentUserId": "user_student001",
  "studentEmail": "emma.student@tutornest.com",
  "temporaryPassword": "Emma7x9f2k1!"  // if generatePassword=true
}
```

### **2. Disable Student Login**
```http
POST /make-server-cbd74580/student-auth/disable-login
Authorization: Bearer {parent_access_token}

Request Body:
{
  "childId": "child_001"
}

Response:
{
  "success": true
}
```

### **3. Independent Student Signup (18+)**
```http
POST /make-server-cbd74580/student-auth/independent-signup

Request Body:
{
  "email": "john@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1998-03-20",
  "subjects": ["Mathematics"],
  "learningGoals": ["Prepare for exams"]
}

Response:
{
  "success": true,
  "userId": "user_student002"
}
```

### **4. Dependent Student Signup (13-17)**
```http
POST /make-server-cbd74580/student-auth/dependent-signup

Request Body:
{
  "email": "jake@example.com",
  "password": "securePassword123",
  "firstName": "Jake",
  "lastName": "Williams",
  "dateOfBirth": "2009-08-10",
  "parentEmail": "parent@example.com",
  "subjects": ["Science"],
  "learningGoals": ["Improve grades"]
}

Response:
{
  "success": true,
  "userId": "user_student003",
  "awaitingParentLink": true,
  "message": "An invitation has been sent to your parent/guardian."
}
```

### **5. Parent Accepts Link Request**
```http
POST /make-server-cbd74580/student-auth/accept-link
Authorization: Bearer {parent_access_token}

Request Body:
{
  "linkToken": "link_xyz789"
}

Response:
{
  "success": true,
  "childId": "child_002"
}
```

### **6. Get Pending Link Requests**
```http
GET /make-server-cbd74580/student-auth/pending-links
Authorization: Bearer {parent_access_token}

Response:
{
  "requests": [
    {
      "id": "parent-link-request:user_student003",
      "studentName": "Jake Williams",
      "studentEmail": "jake@example.com",
      "linkToken": "link_xyz789",
      "createdAt": "2024-11-15T10:00:00Z"
    }
  ]
}
```

### **7. Check Student Link Status**
```http
GET /make-server-cbd74580/student-auth/link-status
Authorization: Bearer {student_access_token}

Response:
{
  "isLinked": false,
  "awaitingParentLink": true,
  "parentEmail": "parent@example.com"
}
```

### **8. Reset Student Password (Parent)**
```http
POST /make-server-cbd74580/student-auth/reset-password
Authorization: Bearer {parent_access_token}

Request Body:
{
  "childId": "child_001",
  "newPassword": "newSecurePassword123"
}

Response:
{
  "success": true
}
```

---

## 🎨 UI Components

### **1. StudentLoginManager Component**
Location: `/components/StudentLoginManager.tsx`

Used in Parent Dashboard to manage student logins for each child.

**Features:**
- Enable/Disable student login
- Auto-generate or custom email
- Generate secure temporary password
- Copy credentials to clipboard
- Reset password

**Usage:**
```tsx
<StudentLoginManager
  child={childProfile}
  accessToken={session.access_token}
  onUpdate={refreshChildProfiles}
/>
```

### **2. PendingLinkRequests Component** (To be created)
Shows parents any pending student link requests from teenagers.

### **3. StudentSignupForm Component** (To be created)
Signup form with age detection and appropriate flow routing.

---

## 🔒 Security Considerations

### **Age Verification**
- Under 13: Must be parent-created
- 13-17: Can self-signup but requires parent approval
- 18+: Fully independent

### **Email Confirmation**
- Parent-created accounts: Auto-confirmed (parent verified)
- Independent signup: Requires email verification
- Dependent signup: Parent approval acts as verification

### **Password Requirements**
- Minimum 6 characters (can be strengthened)
- Parent can reset student passwords at any time
- Students can change their own passwords after first login

### **Data Access**
- Parents can view all child data
- Students can only view their own data
- Dependent students cannot modify billing/payment info

### **Account Disabling**
- Parents can disable student login without deleting data
- Disabled accounts cannot log in
- Audit logs track who disabled and when

---

## 🚀 Implementation Checklist

### **Backend** ✅
- [x] Student auth routes created
- [x] Enable/disable student login endpoints
- [x] Independent student signup
- [x] Dependent student signup with parent linking
- [x] Parent link acceptance
- [x] Password reset functionality
- [x] Link status checking

### **Frontend** ✅
- [x] StudentLoginManager component
- [ ] Student signup form (to be created)
- [ ] Pending link requests UI (to be created)
- [ ] Age-gated signup flow (to be created)
- [ ] Student onboarding flow (to be created)

### **Integration**
- [ ] Add StudentLoginManager to Parent Dashboard
- [ ] Create student signup page
- [ ] Add link request notifications
- [ ] Email invitation system (requires email service)
- [ ] Student dashboard access control

---

## 📧 Email Templates (Future)

### **Parent Invitation Email**
```
Subject: Your child wants to join TutorNest

Hi [Parent Name],

Your child [Student Name] has signed up for TutorNest and listed you 
as their parent/guardian.

To approve their account and manage billing:
[Accept Invitation Button]

This link expires in 7 days.

Best regards,
The TutorNest Team
```

### **Student Login Credentials**
```
Subject: Student Login Enabled for [Child Name]

Hi [Parent Name],

Student login has been enabled for [Child Name].

Login Credentials:
Email: [email]
Password: [temporary_password]

Please share these credentials with [Child Name] and remind them 
to change their password after first login.

Student Dashboard: https://tutornest.com/student/login

Best regards,
The TutorNest Team
```

---

## 🎯 Next Steps

1. **Add StudentLoginManager to Parent Dashboard**
   - Show button for each child profile
   - Display current status (enabled/disabled)

2. **Create Student Signup Page**
   - Age detection
   - Route to appropriate flow
   - Clear messaging about parent approval

3. **Build Pending Links UI**
   - Show in Parent Dashboard
   - Email notifications
   - Accept/Reject actions

4. **Implement Email Service**
   - SendGrid or AWS SES integration
   - Template management
   - Delivery tracking

5. **Student Onboarding**
   - First-login password change
   - Profile completion
   - Tutorial/walkthrough

---

## 💡 Best Practices

1. **Always verify age** before allowing independent signup
2. **Clear communication** about who pays and who manages
3. **Audit logging** for all account linking/unlinking actions
4. **Email notifications** for all parent-child linking events
5. **Secure password generation** using crypto-random functions
6. **Grace periods** for link requests (7 days is standard)
7. **Parent approval required** for students under 18

---

This system ensures **safety, compliance, and great UX** for all user types! 🎉
