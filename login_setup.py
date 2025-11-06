#!/usr/bin/env python3
"""
Standalone script to perform interactive Monarch Money login with MFA support.
Run this script to authenticate and save a session file that the MCP server can use.
"""

import asyncio
import getpass
import sys
from pathlib import Path

# Add the src directory to the Python path for imports
src_path = Path(__file__).parent / "src"
sys.path.insert(0, str(src_path))

from monarchmoney import MonarchMoney, RequireMFAException
from dotenv import load_dotenv
from monarch_mcp_server.secure_session import secure_session

async def main():
    load_dotenv()

    print("\n🏦 Monarch Money - Claude Desktop Setup")
    print("=" * 45)
    print("This will authenticate you once and save a session")
    print("for seamless access through Claude Desktop.\n")

    # Check the version first
    try:
        import monarchmoney
        print(f"📦 MonarchMoney version: {getattr(monarchmoney, '__version__', 'unknown')}")
    except Exception as e:
        print(f"⚠️  Could not check version: {e}")

    # Security awareness: Ask about MFA upfront
    print("\n🔐 Security Check")
    print("-" * 45)
    has_mfa = input("Do you have Multi-Factor Authentication (MFA) enabled on your Monarch Money account? (yes/no): ").strip().lower()

    if has_mfa not in ['yes', 'y']:
        print("\n" + "=" * 45)
        print("⚠️  SECURITY RECOMMENDATION")
        print("=" * 45)
        print("We strongly recommend enabling MFA to protect your")
        print("financial data. Monarch Money contains sensitive")
        print("information about your accounts and transactions.")
        print("\nTo enable MFA:")
        print("  1. Log in to Monarch Money web app")
        print("  2. Go to Settings → Security")
        print("  3. Enable Two-Factor Authentication")
        print("  4. Follow the setup instructions")
        print("\nYou can proceed without MFA, but consider enabling")
        print("it soon for better security.")
        print("=" * 45)

        proceed = input("\nProceed with login? (yes/no): ").strip().lower()
        if proceed not in ['yes', 'y']:
            print("Setup cancelled. Please enable MFA and try again.")
            return

    print("\n📝 Login Credentials")
    print("-" * 45)
    email = input("Email: ")
    password = getpass.getpass("Password: ")

    mm = MonarchMoney()

    try:
        # Clear any existing sessions (both old pickle files and keyring)
        secure_session.delete_token()
        print("\n🗑️ Cleared existing secure sessions")

        print("🔄 Authenticating with Monarch Money...")

        # Direct login attempt with automatic MFA handling
        try:
            await mm.login(email, password, use_saved_session=False, save_session=True)
            print("✅ Login successful!")

        except RequireMFAException:
            print("\n🔐 MFA Required")
            print("A two-factor authentication code has been sent to your device.")
            mfa_code = input("Enter your MFA code: ").strip()

            try:
                await mm.multi_factor_authenticate(email, password, mfa_code)
                print("✅ MFA authentication successful!")
                mm.save_session()
            except Exception as mfa_error:
                print(f"❌ MFA authentication failed: {mfa_error}")
                print("Please verify your MFA code and try again.")
                return

        # Test the connection
        print("\n🧪 Testing connection...")
        try:
            accounts = await mm.get_accounts()
            if accounts and isinstance(accounts, dict):
                account_count = len(accounts.get("accounts", []))
                print(f"✅ Connection successful - Found {account_count} accounts")
            else:
                print("⚠️  Connected but received unexpected data format")
                print(f"Response type: {type(accounts)}")
        except Exception as test_error:
            print(f"❌ Connection test failed: {test_error}")
            print("The login succeeded but there may be an API compatibility issue.")
            print("Try: pip install --upgrade monarchmoney")
            return
        
        # Save session securely to keyring
        print(f"\n🔐 Saving session securely to system keyring...")
        try:
            secure_session.save_authenticated_session(mm)
            print(f"✅ Session saved securely!")
        except Exception as save_error:
            print(f"⚠️  Could not save to keyring: {save_error}")
            print("Your session is still valid for this session, but may not persist.")

        # Success message
        print("\n" + "=" * 45)
        print("🎉 Setup Complete!")
        print("=" * 45)
        print("Your Monarch Money account is now connected.")
        print("\nAvailable tools in Claude Desktop:")
        print("  • get_accounts - View all your accounts")
        print("  • get_transactions - Recent transactions")
        print("  • get_budgets - Budget information")
        print("  • get_cashflow - Income/expense analysis")
        print("\n💡 Your session is encrypted and stored securely.")
        if has_mfa in ['yes', 'y']:
            print("🔒 MFA is enabled - your account is well protected!")
        print("=" * 45)

    except Exception as e:
        print(f"\n❌ Setup failed: {e}")
        print("\nTroubleshooting:")
        print("  • Verify your email and password are correct")
        print("  • Check your internet connection")
        print("  • Ensure MFA code is current (expires quickly)")
        print("  • Try: pip install --upgrade monarchmoney")
        print(f"\nError details: {type(e).__name__}")

if __name__ == "__main__":
    asyncio.run(main())