// Opens a file that needs the auth header (so it can't be a plain link) in a new tab.
// The tab is opened before the await, while we still have the click; popup blockers stop it afterwards.
export async function openFileInNewTab(fetchBlob) {
  const tab = window.open('', '_blank');
  try {
    const url = URL.createObjectURL(await fetchBlob());
    if (tab) tab.location.href = url;
    else window.location.assign(url);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    tab?.close();
    throw err;
  }
}

// Saves a downloaded blob under the given file name.
export function saveFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
