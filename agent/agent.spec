a = Analysis(
    ['agent.py'],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=[
        'win32con',
        'win32file',
        'win32process',
        'winerror',
        'urllib3.util',
        'urllib3.util.retry'
    ],
    hookspath=[],
)