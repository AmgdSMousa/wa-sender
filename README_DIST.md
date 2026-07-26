# Smart WhatsApp Sender - Professional Edition

Professional bulk WhatsApp messaging system with CRM, Automated Bot Rules, and AI-powered Smart Responses.

## 🚀 Quick Start (Docker)

The easiest way to run the application is using Docker.

1.  **Clone the repository** (if provided as source) or enter the project directory.
2.  **Configure environment**:
    - Copy `.env.example` to `.env`.
    - Edit `.env` and set your `NEXTAUTH_SECRET` (any random string).
    - (Optional) Customize `NEXT_PUBLIC_APP_NAME` and other branding variables.
3.  **Run with Docker Compose**:
    ```bash
    docker-compose up -d
    ```
4.  **Access the application**:
    - Open `http://localhost:3000` in your browser.
    - Login with username `admin` and any password for the first time (this will create your admin account).

## 📁 Key Features

- **Campaign Management**: Send personalized messages with names and media attachments.
- **CRM Lite**: Manage your contacts, tags, and custom metadata.
- **Smart Bot**: Set automatic reply rules based on keywords (Exact, Contains, Starts-with).
- **AI Integration**: Connect to Google Gemini AI for intelligent 24/7 customer support.
- **Group Extraction**: Fetch and export members from your WhatsApp groups.

## 🛠️ Configuration

Edit the `.env` file to customize the app for your business:

| Variable | Description |
| :--- | :--- |
| `NEXT_PUBLIC_APP_NAME` | Your Company/App Name |
| `NEXT_PUBLIC_APP_DESC` | Tagline shown in sidebar |
| `NEXT_PUBLIC_COPYRIGHT`| Footer copyright notice |
| `PORT` | Port to run the app on (Default: 3000) |

## ⚠️ Important Notes

- **Initial Setup**: The very first user to log in with the username `admin` will be the system administrator.
- **Session Data**: WhatsApp session data is stored in the `.wwebjs_auth` directory. This is mapped as a Docker volume to ensure you don't need to scan the QR code every time you restart the service.
- **Database**: Uses SQLite for portability and ease of distribution. The database file is located in `prisma/dev.db`.

---
*Professional Solutions for WhatsApp Automation*
