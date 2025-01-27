import os
import time
import sys
from rich.console import Console
from rich.text import Text
from rich import print as rprint
from rich.panel import Panel
import asyncio
from example import main as example1
from example3 import main as example3

def clear_screen():
    """Clear the terminal screen"""
    os.system('clear' if os.name == 'posix' else 'cls')

def type_text(text, delay=0.03):
    """Type text with a typewriter effect"""
    for char in text:
        sys.stdout.write(char)
        sys.stdout.flush()
        time.sleep(delay)
    print()

def display_versantus_logo():
    logo = """*******************************************************************************
*******************************************************************************
*******************************************************************************
*******************************************************************************
*******************************************************************************
*******************************************************************************
*********************************+==-:::::--==*********************************
****************************=:.                 .:=****+=====******************
************************+-                          :*=.   :*******************
**********************=.                           :*=.   :********************
********************-.                            :*-    :*********************
******************=.                             :*:    =*: =******************
****************+:                .:-=====-:.   =*:   .=*:   :+****************
****************.             .-+*************++*:   .=+.     .+***************
**************+.+**+++++++++++*****************+:   .+=.        =**************
*************+. .=*:          .+**************+:   :*=.         .=*************
*************:    =*-          .+************+.   :+*=           :+************
************=      :****+*+*=    =**********=    :*+++++**-       =************
************:       :*=.   -*=    -********=.   -*-.  .=*:        :************
************.        :*+.   -*+.   :******=.  .=*:   .=*.          ************
***********+          .*+:   :*+.   :****-   .=*:   .=**.          =***********
***********+          :***:   .++.   .+*:   .++:   :+***:          =***********
***********+          .****-   .+*:   ..   :+*.   :+****.          =***********
************.          +****-   .=*:      :++    :*****+           ************
************:          :*****-    =*:    :*=.   -******:          :************
************=           =*****=    -*-  -*=.  .=******=.          =************
*************:           =*****+.   :*=-*-    =******=           :+************
*************+.           :+****+.   :**:   .=*****+:           .=*************
**************+            .:*****.   .:   :+*****-.            =**************
****************.             .=***:      :+***=.             .+***************
****************+:                =*:    :*=:                :+****************
******************=.               -*-  :*=.                =******************
********************-               -*=-*=                :********************
**********************-.             :**:              .-**********************
************************+:.           ::             :=************************
****************************=:                   .=****************************
*********************************+=-:::::::-==*********************************
*******************************************************************************
*******************************************************************************
*******************************************************************************
*******************************************************************************
*******************************************************************************
*******************************************************************************"""
    console = Console()
    console.print(Panel(Text(logo, style="bold magenta")))

def display_ascii_banner():
    banner = """
    ╔══════════════════════════════════════════════════════════════╗
    ║  ╔═╗╦  ╔═╗╔═╗╔═╗╔╗╔╔╦╗╔═╗  ╦╔╗╔  ╔═╗╔═╗╔╦╗╦╔═╗╔╗╔  ║
    ║  ╠═╣║  ╠═╣║ ╦║╣ ║║║ ║ ╚═╗  ║║║║  ╠═╣║   ║ ║║ ║║║║  ║
    ║  ╩ ╩╩═╝╩ ╩╚═╝╚═╝╝╚╝ ╩ ╚═╝  ╩╝╚╝  ╩ ╩╚═╝ ╩ ╩╚═╝╝╚╝  ║
    ╚══════════════════════════════════════════════════════════════╝
    """
    console = Console()
    console.print(Panel(Text(banner, style="bold blue")))

async def main():
    # Initial logo display
    clear_screen()
    display_versantus_logo()
    time.sleep(3)  # Show logo for 3 seconds
    
    # Clear and start presentation
    clear_screen()
    display_ascii_banner()
    time.sleep(2)

    # Introduction
    type_text("\n🤖 Welcome to a short intro to the powerful new world of AI agents.", 0.05)
    time.sleep(2)
    
    type_text("\n🌐 Today I'm going to demo an AI agent that can control a web browser to complete actions.", 0.05)
    time.sleep(2)

    # First example
    print("\n" + "="*70)
    type_text("📝 First Example: Writing a Letter", 0.05)
    print("="*70)
    time.sleep(1)
    
    type_text("\nHere's the prompt:", 0.05)
    rprint("[yellow]Write a letter in Google docs to my pappa, John Doe, and ask him to buy me a new laptop. You'll need to sign in with my nik@versantus.co.uk details using Lastpass[/yellow]")
    time.sleep(2)
    
    type_text("\nHere's the code:", 0.05)
    with open('example.py', 'r') as file:
        rprint("[green]" + file.read() + "[/green]")
    time.sleep(10)
    
    type_text("\n▶️ Running the example...", 0.05)
    await example1()
    
    # Clear screen after first example
    input("\nPress Enter to continue...")
    clear_screen()
    display_versantus_logo()
    display_ascii_banner()
    
    # Second example
    print("\n" + "="*70)
    type_text("📊 Second Example: AI Research Assistant", 0.05)
    print("="*70)
    time.sleep(1)
    
    type_text("\nNow for a more complex example showing autonomous research:", 0.05)
    time.sleep(1)
    
    rprint("\n[yellow]Create a new Google doc and research the US 2024 election results using BBC news. Then write a report about it, as if it was written by Nik Roberts, our US correspondent. Use quotes from the BBC news article, but make the rest of the text distinct. Add placeholder images and infographics. The article should be around 1000 words[/yellow]")
    time.sleep(2)
    
    type_text("\n▶️ Running the research task...", 0.05)
    await example3()
    
    # Clear screen for ending
    input("\nPress Enter for the finale...")
    clear_screen()
    
    # Final logo and call to action
    display_versantus_logo()
    time.sleep(2)
    
    print("\n" + "="*70)
    type_text("🎉 What could YOU use AI agents for...?", 0.1)
    print("="*70)
    
    type_text("\n💡 Perhaps...", 0.05)
    time.sleep(1)
    type_text("  • Automating your daily research?", 0.05)
    time.sleep(0.5)
    type_text("  • Managing your social media presence?", 0.05)
    time.sleep(0.5)
    type_text("  • Generating reports and documentation?", 0.05)
    time.sleep(0.5)
    type_text("  • Monitoring competitor websites?", 0.05)
    time.sleep(0.5)
    type_text("\n🚀 The possibilities are endless...", 0.05)
    time.sleep(2)

if __name__ == "__main__":
    asyncio.run(main()) 