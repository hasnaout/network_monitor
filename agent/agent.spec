# -*- mode: python ; coding: utf-8 -*-

import sys
from PyInstaller.utils.hooks import collect_submodules

block_cipher = None

# PyWin32 modules (important pour service Windows)
hidden_imports = [
    "win32timezone",
    "win32service",
    "win32serviceutil",
    "win32event",
    "servicemanager",
    "win32api",
    "pywintypes",
    "netifaces",          # ← ajouté pour get_mac() fiable
]
hidden_imports += collect_submodules("requests")

# Si requests ou dépendances cachées
hidden_imports += collect_submodules("requests")


a = Analysis(
    ['agent.py'],
    pathex=[],
    binaries=[],
    datas=[
        # si tu veux inclure config par défaut
        ('agent.config.json', '.'),
    ],
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        "tkinter",
        "matplotlib",
        "pandas",
        "numpy",
        "IPython"
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='NetworkAgent',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,   # pas de fenêtre cmd (service)
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    name='NetworkAgent'
)