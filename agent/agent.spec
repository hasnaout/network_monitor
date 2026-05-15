# -*- mode: python ; coding: utf-8 -*-

import sys
from pathlib import Path
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
]
hidden_imports += collect_submodules("requests")

python_binaries = []
python_dir = Path(sys.base_prefix)
for dll_name in (
    f"python{sys.version_info.major}{sys.version_info.minor}.dll",
    "python3.dll",
):
    dll_path = python_dir / dll_name
    if dll_path.exists():
        python_binaries.append((str(dll_path), "."))


a = Analysis(
    ['agent.py'],
    pathex=[],
    binaries=python_binaries,
datas=[
        ('agent.config.json', '.'),
        ('install.bat', '.'),
        ('uninstall.bat', '.'),
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
    console=False,
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
