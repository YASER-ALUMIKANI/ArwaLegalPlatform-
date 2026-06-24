import os
import subprocess
import sys
import time

def main():
    print("========================================================")
    print("        Arwa Legal Platform - Silent Python Runner     ")
    print("========================================================")
    print()

    # المجلد الرئيسي للمشروع
    base_dir = os.path.dirname(os.path.abspath(__file__))

    # إعدادات الواجهة الخلفية (Backend)
    backend_dir = os.path.join(base_dir, "backend")
    uvicorn_path = os.path.join(backend_dir, ".venv", "Scripts", "uvicorn.exe")
    
    # إعدادات الواجهة الأمامية (Frontend)
    frontend_dir = os.path.join(base_dir, "frontend")

    # التحقق من وجود uvicorn
    if not os.path.exists(uvicorn_path):
        print(f"Error: Virtual environment or uvicorn not found at {uvicorn_path}")
        print("Please check your backend installation.")
        sys.exit(1)

    # إنشاء مجلد سجلات التشغيل (Logs) إن لم يكن موجوداً
    logs_dir = os.path.join(base_dir, "logs")
    if not os.path.exists(logs_dir):
        os.makedirs(logs_dir)

    backend_log_path = os.path.join(logs_dir, "backend.log")
    frontend_log_path = os.path.join(logs_dir, "frontend.log")

    # فتح ملفات السجلات للكتابة
    # نستخدم buffering=1 للكتابة الفورية للأسطر لسهولة متابعة السجلات مباشرة
    backend_log = open(backend_log_path, "w", encoding="utf-8", buffering=1)
    frontend_log = open(frontend_log_path, "w", encoding="utf-8", buffering=1)

    print("[1/2] Starting Backend Server (FastAPI) [SILENT]...")
    # تشغيل uvicorn في الخلفية بدون نافذة جديدة وتوجيه المخرجات لملف السجل
    backend_cmd = [uvicorn_path, "app.main:app", "--reload"]
    backend_process = subprocess.Popen(
        backend_cmd,
        cwd=backend_dir,
        stdout=backend_log,
        stderr=subprocess.STDOUT
    )

    print("[2/2] Starting Frontend Server (React/Vite) [SILENT]...")
    # تشغيل npm run dev في الخلفية بدون نافذة جديدة وتوجيه المخرجات لملف السجل
    frontend_cmd = ["cmd", "/c", "npm run dev"]
    frontend_process = subprocess.Popen(
        frontend_cmd,
        cwd=frontend_dir,
        stdout=frontend_log,
        stderr=subprocess.STDOUT
    )

    print()
    print("--------------------------------------------------------")
    print("✓ Servers are running silently in the background!")
    print()
    print(" - Frontend URL: http://localhost:5173")
    print(" - Backend API:  http://127.0.0.1:8000")
    print(" - API Docs:     http://127.0.0.1:8000/docs")
    print()
    print("Log files generated at:")
    print(f" - Backend logs:  logs/backend.log")
    print(f" - Frontend logs: logs/frontend.log")
    print("--------------------------------------------------------")
    print()
    print("Press Ctrl+C in this terminal to stop both servers.")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[!] Stopping runner and terminating child processes...")
        backend_process.terminate()
        frontend_process.terminate()
        
        # إغلاق ملفات السجلات
        backend_log.close()
        frontend_log.close()
        print("[✓] Both servers have been stopped cleanly.")

if __name__ == "__main__":
    main()
