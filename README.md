<div align="center">
  <img src="imgs/final_logo.png" alt="Logo" width="400">
</div>

<br>

<div align="center">

  <a href="https://nodejs.org/">
    <img src="https://img.shields.io/badge/Backend-Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white">
  </a>

  <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript">
    <img src="https://img.shields.io/badge/Language-JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black">
  </a>

  <a href="https://tailwindcss.com/">
    <img src="https://img.shields.io/badge/Frontend-TailwindCSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white">
  </a>

</div>

---

# Traceback: TIPQC Lost-and-Found System

A relational DBMS engineered to overhaul the TIPQC Office of Student Affairs (OSA) asset recovery process. Traceback eliminates information silos by replacing opaque logs with a normalized relational schema, ensuring high-integrity transparency and secure access control.

## 📌 The Problem: Data Opacity & Accountability
The current TIPQC system limits student visibility to item photos and IDs, while lacking a secure method to track the chain of custody. Critical metadata—such as discovery locations, receiver identities, and claim timestamps—is abstracted. Traceback solves this by providing a verifiable audit trail for every item.

## 👥 Role-Based Access Control (RBAC)
Traceback utilizes a centralized authentication system to bifurcate user experiences based on permissions:

### 1. Administrative Portal (OSA Role)
* **Write & Update Privileges:** Authorized personnel can register new items, update statuses, and link claimants to records.
* **Privacy Management:** Controls the visibility of sensitive student data on the public dashboard.

### 2. Transparency Dashboard (Student Role)
* **Live Status Tracking:** Real-time visibility into whether an item is available, claimed, or approaching the 30-day discard threshold.
* **Secure Verification:** Uses the student’s actual student ID to match identity records during the claiming process.

---

## ⚙️ Technical Architecture

### Authentication Layer
The system implements a `Users` table to manage security:
* **Roles:** `Admin/Staff` vs. `Student`.
* **Security:** Ensures that "Delete" and "Update" operations are restricted to authorized OSA accounts, preventing unauthorized data manipulation.

### Schema Normalization
Built on **MySQL**, the database architecture uses normalized schemas to:
* Eliminate data redundancy.
* Provide an immutable audit trail from initial intake to final claim or disposal.

---

## 🛠 Testing & Future-Scalability
* **Auth Validation:** Testing login redirects and permission-gating for OSA vs. Student views. An OSA Admin account has the only permission to create, update, and delete records.
* **CRUD Integrity:** Verified via mock scenarios tracking items from discovery through the 30-day expiration cycle.
* **Future Expansion:** Potential for multi-factor authentication (MFA) and integration with the TIPQC institutional login API.
* **Advanced Heuristic Search:** Implementing keyword-based filtering (e.g., "blue wallet", "Room 402") to improve item discoverability.
* **Image Expansion:** Supporting multi-angle photo uploads to assist in visual verification.

---
**Developed for the TIPQC Office of Student Affairs.**

