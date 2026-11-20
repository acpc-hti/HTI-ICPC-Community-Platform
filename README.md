<p align="center">
  <img src="frontend/assets/img/hti-icpc-logo.jpg" alt="HTI ICPC Community Logo" width="160" style="border-radius: 50%;">
</p>

<h1 align="center">HTI ICPC Community Platform</h1>

<p align="center">
  <strong>المنصة الرسمية لمجتمع البرمجة التنافسية</strong><br>
  <em>المعهد التكنولوجي العالي – بني سويف</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-HTML%20%7C%20CSS%20%7C%20JS-blue?style=for-the-badge" alt="Frontend">
  <img src="https://img.shields.io/badge/Backend-Google%20Apps%20Script-green?style=for-the-badge" alt="Backend">
  <img src="https://img.shields.io/badge/Database-Google%20Sheets-orange?style=for-the-badge" alt="Database">
  <img src="https://img.shields.io/badge/Hosting-Vercel-black?style=for-the-badge" alt="Hosting">
  <img src="https://img.shields.io/badge/Theme-Dark%20Glassmorphism-purple?style=for-the-badge" alt="Theme">
</p>

<p align="center"><em>"Think. Code. Compete. Win."</em></p>

---

## 🎯 Overview

Full-stack platform that manages the **HTI ICPC Community** — from student registration and application tracking to admin review dashboards and member portals. Built with a modern dark glassmorphism UI, fully responsive RTL design, and a serverless Google Apps Script backend.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🏠 **Landing Page** | Hero section, community stats, activities, 3-phase qualification roadmap, FAQ accordion |
| 📝 **Student Registration** | Multi-step application form with real-time validation & duplicate prevention |
| 🔍 **Application Tracking** | Status timeline with tracking token lookup |
| 👨‍💼 **Admin Dashboard** | Role-based access, analytics charts, application review queue, CSV export, audit logs |
| 👨‍🎓 **Member Portal** | Training roadmap, upcoming sessions, contest announcements, community links |
| 🗑️ **Account Management** | Super Admin can create/delete admin accounts and member accounts |
| 📧 **Email Notifications** | Automated HTML emails on application status changes |
| 🔐 **Security** | Salted SHA-256 password hashing, RBAC authorization, privacy-protected tracking |
| 💾 **Dual-Mode** | Works locally with in-browser mock database OR connects to live Google Apps Script API |

---

## 🗺️ Qualification Roadmap

```
┌─────────────────┐     ┌─────────────────────┐     ┌──────────────────────┐
│   المرحلة 01    │     │     المرحلة 02      │     │     المرحلة 03       │
│   ───────────   │     │     ───────────      │     │     ───────────       │
│   التأسيس و     │ ──► │  Algorithms و       │ ──► │  معسكر النخبة        │
│ Problem Solving │     │  Data Structures    │     │  والتصفيات الكبرى    │
│                 │     │                     │     │                      │
│  C++ • STL •    │     │ Binary Search •     │     │ Segment Trees •      │
│  Math • Arrays  │     │ Graphs • Greedy •   │     │ DP Advanced •        │
│  Complexity     │     │ Recursion           │     │ DSU • Max Flow       │
└────────┬────────┘     └──────────┬──────────┘     └──────────┬───────────┘
         │                        │                            │
    ⚡ Contest                 🏆 HTI Local               🌍 ECPC / ACPC
    تصفية أولى               Contest تصفية               البطولات الرسمية
```

---

## 📂 Project Structure

```
ACPC_HTI/
│
├── 📁 frontend/
│   ├── index.html                 # الصفحة الرئيسية
│   ├── apply.html                 # استمارة التسجيل
│   ├── track.html                 # متابعة حالة الطلب
│   ├── portal.html                # بوابة الطلاب
│   ├── admin.html                 # لوحة تحكم الأدمن
│   ├── css/
│   │   └── styles.css             # Dark Glassmorphism Design System
│   ├── js/
│   │   ├── config.js              # إعدادات المنصة
│   │   ├── mock-db.js             # قاعدة بيانات محلية للتجربة
│   │   ├── api.js                 # طبقة الـ API الموحدة
│   │   ├── main.js                # Landing Page Controller
│   │   ├── apply.js               # Registration Controller
│   │   ├── track.js               # Tracking Controller
│   │   ├── portal.js              # Member Portal Controller
│   │   └── admin.js               # Admin Dashboard Controller
│   └── assets/
│       └── img/                   # الصور والشعارات
│
├── 📁 backend/
│   ├── Code.gs                    # Main API Router
│   ├── Database.gs                # Sheet Engine & LockService
│   ├── Auth.gs                    # Authentication & RBAC
│   ├── Applications.gs            # Application Pipeline
│   ├── Members.gs                 # Member Management
│   ├── Events.gs                  # Events & Announcements CRUD
│   ├── Email.gs                   # HTML Email Dispatch
│   ├── Utils.gs                   # Helpers & Sanitization
│   └── All_In_One_Code.gs         # 📦 ملف واحد جاهز للنشر على Apps Script
│
├── 📁 database/
│   └── schema.md                  # مخطط قاعدة البيانات (11 جدول)
│
├── 📁 test/
│   └── test-runner.js             # اختبارات تلقائية (40 اختبار)
│
├── vercel.json                    # إعدادات Vercel
└── README.md
```

---

## ⚡ Quick Start

> **لا يحتاج أي تثبيت!** افتح الملفات مباشرة في المتصفح أو شغّل سيرفر محلي:

```bash
# Python
python -m http.server 8000 --directory frontend

# Node.js
npx serve frontend
```

ثم افتح `http://localhost:8000` في المتصفح.

---

## 🚀 Deployment

### Frontend (Vercel)
1. اربط الـ Repository بـ [Vercel](https://vercel.com)
2. الإعدادات جاهزة في `vercel.json` — الـ deploy تلقائي

### Backend (Google Apps Script)
1. أنشئ مشروع جديد في [Google Apps Script](https://script.google.com)
2. انسخ محتوى `backend/All_In_One_Code.gs` في الملف الرئيسي
3. شغّل `setupInitialDatabase()` مرة واحدة
4. انشر كـ **Web App** واحصل على الرابط
5. ضع الرابط في `frontend/js/config.js`

---

## 🗄️ Database Schema

| # | Sheet | الوصف |
|---|---|---|
| 1 | `Registrations` | طلبات تسجيل الطلاب |
| 2 | `Members` | الأعضاء المقبولين |
| 3 | `Admins` | حسابات الإدارة |
| 4 | `AccessTokens` | إدارة الجلسات |
| 5 | `StatusHistory` | سجل تغييرات حالة الطلبات |
| 6 | `AdminActivityLogs` | سجل عمليات الأدمن |
| 7 | `EmailLogs` | سجل الإيميلات المرسلة |
| 8 | `Announcements` | الإعلانات والأخبار |
| 9 | `TrainingSessions` | جدول التدريب الأسبوعي |
| 10 | `Events` | المسابقات والمعسكرات |
| 11 | `Settings` | إعدادات وروابط المجتمع |

---

## 🛡️ Security

- 🔒 **Salted SHA-256** password hashing with unique per-account salts
- 🛂 **Role-Based Access Control** (RBAC) on every API endpoint
- 🕵️ **Privacy Protection** — admin notes & reviewer identities redacted from student queries
- 🔐 **Concurrency Locks** via Google Apps Script `LockService`
- 📋 **Immutable Audit Logs** for all administrative actions

---

## 🧪 Testing

```bash
node test/test-runner.js
```

```
✅ Suite 1: Database Initialization ............ PASS
✅ Suite 2: Application Submission ............. PASS
✅ Suite 3: Duplicate Prevention ............... PASS
✅ Suite 4: Admin Authentication & RBAC ........ PASS
✅ Suite 5: Application Review Pipeline ........ PASS
✅ Suite 6: Member Auto-Promotion .............. PASS
✅ Suite 7: Account Deletion & Log Clearing .... PASS
✅ Suite 8: Events & Training Management ....... PASS

📊 Result: 40/40 PASS
```

---

## 🛠️ Tech Stack

<table>
  <tr>
    <td align="center"><strong>Frontend</strong></td>
    <td>HTML5 · CSS3 · JavaScript (Vanilla) · Bootstrap 5.3 RTL · Font Awesome 6 · Chart.js</td>
  </tr>
  <tr>
    <td align="center"><strong>Backend</strong></td>
    <td>Google Apps Script (V8 Runtime)</td>
  </tr>
  <tr>
    <td align="center"><strong>Database</strong></td>
    <td>Google Sheets (11 relational tables)</td>
  </tr>
  <tr>
    <td align="center"><strong>Fonts</strong></td>
    <td>Cairo (Arabic) · Inter (English) · JetBrains Mono (Code)</td>
  </tr>
  <tr>
    <td align="center"><strong>Hosting</strong></td>
    <td>Vercel (Frontend) · Google Apps Script Web App (API)</td>
  </tr>
  <tr>
    <td align="center"><strong>Design</strong></td>
    <td>Dark Theme · Glassmorphism · RTL-First · Mobile Responsive</td>
  </tr>
</table>

---

<p align="center">
  <strong>HTI ICPC Community</strong><br>
  المعهد التكنولوجي العالي – بني سويف<br>
  <em>جميع الحقوق محفوظة © 2026</em>
</p>
