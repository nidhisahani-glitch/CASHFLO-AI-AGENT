import subprocess
import sys
import os
import json

def run_command(command, cwd=None, shell=True, capture_output=False):
    print(f"\n> Running: {command} in {cwd if cwd else 'root'}")

    try:
        if "npm run dev" in command:
            return subprocess.Popen(command, cwd=cwd, shell=shell)

        if capture_output:
            result = subprocess.run(
                command,
                cwd=cwd,
                shell=shell,
                text=True,
                capture_output=True
            )

            print("STDOUT:\n", result.stdout)
            print("STDERR:\n", result.stderr)

            if result.returncode != 0:
                raise subprocess.CalledProcessError(result.returncode, command)

            return result.stdout

        else:
            result = subprocess.run(
                command,
                cwd=cwd,
                shell=shell,
                text=True,
                capture_output=True
            )

            print(result.stdout)
            print(result.stderr)

            if result.returncode != 0:
                raise subprocess.CalledProcessError(result.returncode, command)

    except subprocess.CalledProcessError as e:
        print(f"❌ Error executing command: {e}")
        sys.exit(1)


def main():
    print("====================================================")
    print("   CASHFLO AI POLICY AGENT - MASTER BOOTSTRAP v2    ")
    print("====================================================")

    # =========================
    # STEP 1: RUN NEW PIPELINE
    # =========================
    print("[STEP 1/3] Running Rule-Based Engine (logic.py)...")

    output = run_command("python logic.py", capture_output=True)

    print("\n📊 PIPELINE OUTPUT:")
    print(output)

    # Optional: Save output for frontend
    try:
        result_json = json.loads(output.split("📊 FINAL RESULT")[-1])
        with open("web/src/data/result.json", "w") as f:
            json.dump(result_json, f, indent=2)
        print("✅ Result saved for dashboard.")
    except:
        print("⚠️ Could not parse output for frontend (non-critical).")

    # =========================
    # STEP 2: SETUP WEB
    # =========================
    web_dir = os.path.join(os.getcwd(), "web")

    if not os.path.exists(os.path.join(web_dir, "node_modules")):
        print("\n[STEP 2/3] Installing web dependencies...")
        run_command("npm install", cwd=web_dir)
    else:
        print("\n[STEP 2/3] Web dependencies already installed.")

    # =========================
    # STEP 3: LAUNCH DASHBOARD
    # =========================
    print("\n[STEP 3/3] Launching Web Dashboard...")
    print("🌐 http://localhost:5173")

    server_process = run_command("npm run dev", cwd=web_dir)

    try:
        server_process.wait()
    except KeyboardInterrupt:
        print("\n\n🛑 Shutting down system...")
        server_process.terminate()
        sys.exit(0)


if __name__ == "__main__":
    main()