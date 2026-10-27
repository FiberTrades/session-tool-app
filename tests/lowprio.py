# Imported by every test runner: the runner below normal priority, and with it the relay, the stand-in EAs and the browser tests it
# starts, which inherit its class (27 Oct 2026: tests held Nestor's PC at 93-100% CPU while he traded). The test Edges themselves go
# lower still, to idle: browser_test.edge_popen().
import os

if os.name == 'nt':
    try:
        import ctypes
        from ctypes import wintypes
        _k32 = ctypes.WinDLL('kernel32', use_last_error=True)
        _k32.GetCurrentProcess.restype = wintypes.HANDLE
        _k32.SetPriorityClass.argtypes = [wintypes.HANDLE, wintypes.DWORD]
        _k32.SetPriorityClass(_k32.GetCurrentProcess(), 0x4000)   # BELOW_NORMAL_PRIORITY_CLASS
    except Exception:
        pass
