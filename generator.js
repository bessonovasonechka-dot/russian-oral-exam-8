let referenceBookText = "";

const ticketList = document.querySelector("#ticket-list");
const fileInput = document.querySelector("#reference-file");
const fileStatus = document.querySelector("#file-status");
const generationStatus = document.querySelector("#generation-status");
const generateButton = document.querySelector("#generate");
const output = document.querySelector("#output");
const shporaContent = document.querySelector("#shpora-content");

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderTicketChoices() {
  ticketsData.forEach((ticket) => {
    const label = makeElement("label", "ticket-choice");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = String(ticket.id);
    const text = makeElement("span", "", `Билет №${ticket.id}. ${ticket.title}`);
    label.append(input, text);
    ticketList.append(label);
  });
}

document.querySelector("#load-file").addEventListener("click", () => {
  const file = fileInput.files[0];
  if (!file) {
    fileStatus.textContent = "Выберите TXT-файл.";
    return;
  }
  if (!file.name.toLowerCase().endsWith(".txt")) {
    fileStatus.textContent = "Поддерживается только формат TXT.";
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    referenceBookText = String(reader.result || "");
    fileStatus.textContent = referenceBookText.trim()
      ? `Справочник загружен: ${file.name}`
      : "Файл пуст. Будут использованы ответы из data.js.";
  });
  reader.addEventListener("error", () => {
    referenceBookText = "";
    fileStatus.textContent = "Не удалось прочитать файл.";
  });
  reader.readAsText(file, "UTF-8");
});

function appendExamples(container, ticket) {
  if (!ticket.examples.length) {
    container.append(makeElement("p", "hint", "Примеры не найдены в базе."));
    return;
  }

  const heading = makeElement("p", "", "Литературные примеры:");
  const list = makeElement("div", "example-list");
  ticket.examples.forEach((example) => {
    const source = example.work ? `${example.author} «${example.work}»` : example.author;
    list.append(makeElement("blockquote", "example", `${source}: "${example.text}"`));
  });
  container.append(heading, list);
}

function renderTicket(ticket, answer) {
  const article = makeElement("article", "ticket-item");
  article.append(makeElement("h3", "", `Билет №${ticket.id}. ${ticket.title}`));
  article.append(makeElement("p", "ticket-content", answer));
  appendExamples(article, ticket);
  return article;
}

async function requestOpenAI(ticket, apiKey) {
  const prompt = [
    "Ты — учитель русского языка.",
    "Используй только текст справочника ниже. Не добавляй сведения из других источников.",
    "Если в справочнике нет ответа, так и напиши.",
    `Тема билета: ${ticket.title}`,
    "Справочник:",
    referenceBookText
  ].join("\n\n");

  // Пример прямого API-вызова. В опубликованном проекте выполняйте его на сервере.
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1
    })
  });

  if (!response.ok) throw new Error(`OpenAI API: ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || ticket.content;
}

async function generateAnswers() {
  const selectedIds = [...ticketList.querySelectorAll("input:checked")].map((input) => Number(input.value));
  const selectedTickets = ticketsData.filter((ticket) => selectedIds.includes(ticket.id));
  if (!selectedTickets.length) {
    generationStatus.textContent = "Выберите хотя бы один билет.";
    return;
  }

  const apiKey = document.querySelector("#api-key").value.trim();
  const useAI = Boolean(apiKey && referenceBookText.trim());
  generateButton.disabled = true;
  generationStatus.textContent = useAI ? "Создаём ответы по загруженному справочнику…" : "Используются ответы из data.js.";
  shporaContent.replaceChildren();

  let fallbackCount = 0;
  for (const ticket of selectedTickets) {
    let answer = ticket.content;
    if (useAI) {
      try {
        answer = await requestOpenAI(ticket, apiKey);
      } catch (error) {
        fallbackCount += 1;
        console.error(error);
      }
    }
    shporaContent.append(renderTicket(ticket, answer));
  }

  output.hidden = false;
  generateButton.disabled = false;
  generationStatus.textContent = fallbackCount
    ? `API недоступен для ${fallbackCount} билет(ов). Использованы ответы из data.js.`
    : useAI ? "Ответы созданы по справочнику." : "Шпаргалка готова.";
  output.scrollIntoView({ behavior: "smooth", block: "start" });
}

generateButton.addEventListener("click", generateAnswers);
document.querySelector("#print").addEventListener("click", () => window.print());
document.querySelector("#clear").addEventListener("click", () => {
  ticketList.querySelectorAll("input:checked").forEach((input) => { input.checked = false; });
  shporaContent.replaceChildren();
  output.hidden = true;
  generationStatus.textContent = "";
});

renderTicketChoices();
