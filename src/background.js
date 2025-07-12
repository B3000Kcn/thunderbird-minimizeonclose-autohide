(async function(){
  let mainWindows = []; // window ids of currently open main windows

  // Called whenever a main window is attempting to close, instead of actually
  // closing.
  const windowClosingCallback = async function(windowId) {
    let index = mainWindows.indexOf(windowId);
    if (index >= 0) {
      if (mainWindows.length <= 1 &&
          (await messenger.windows.get(windowId)).state != "minimized") {
        // Attempt to close the last window and not minimized: minimize it.
        await messenger.windows.update(windowId, {
          "state": "minimized"
        });
        return;
      } else {
        // Permit closing non-last and minimized main windows
        mainWindows.splice(index, 1);
      }
    }
    // Permit closing. As we locked the window, we need to unlock it first.
    await messenger.ex_windows.unlockWindow(windowId);
    await messenger.windows.remove(windowId);
  };
  await messenger.ex_windows.onClosing.addListener(windowClosingCallback);

  // This listener is now only responsible for registering and locking a window.
  // It is called for windows present at startup, AND for any window opened afterwards.
  const windowRegistrationListener = async function(windowInfo) {
    if (windowInfo.id && windowInfo.type === "normal") {
      mainWindows.push(windowInfo.id);
      await messenger.ex_windows.lockWindow(windowInfo.id);
    }
  }
  // Register the listener for any window created AFTER the add-on has started.
  await messenger.windows.onCreated.addListener(windowRegistrationListener);

  // Get all windows that are already present at startup.
  const windowInfos = await messenger.windows.getAll();
  for (let windowInfo of windowInfos) {
    // First, register and lock these initial windows.
    await windowRegistrationListener(windowInfo);

    // THEN, apply the startup-minimize logic ONLY to these initial main windows.
    if (windowInfo.id && windowInfo.type === "normal") {
      await messenger.windows.update(windowInfo.id, {
        "state": "minimized"
      });
    }
  }
})().catch(console.error)
