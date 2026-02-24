export function getPlainTextFromHTML(html: string, maxLength = 160) {
    if (!html) return "";
  
    const temp = document.createElement("div");
    temp.innerHTML = html;
  
    const text = temp.textContent || temp.innerText || "";
  
    return text.length > maxLength
      ? text.slice(0, maxLength).trim() + "..."
      : text;
  }