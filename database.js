const searchInput = document.querySelector("#search");
const results = document.querySelector("#results");
const resultsMeta = document.querySelector("#results-meta");

const allExamples = ticketsData.flatMap((ticket) => ticket.examples.map((example) => ({
  ticketTitle: ticket.title,
  author: example.author,
  work: example.work,
  text: example.text
})));

function renderResults() {
  const query = searchInput.value.trim().toLocaleLowerCase("ru");
  const matches = allExamples.filter((example) => {
    if (!query) return true;
    return [example.author, example.work, example.text]
      .some((value) => value.toLocaleLowerCase("ru").includes(query));
  });

  results.replaceChildren();
  resultsMeta.textContent = `Найдено: ${matches.length}`;

  if (!matches.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Ничего не найдено.";
    results.append(empty);
    return;
  }

  matches.forEach((example) => {
    const item = document.createElement("article");
    item.className = "result";

    const ticket = document.createElement("p");
    ticket.className = "result-ticket";
    ticket.textContent = example.ticketTitle;

    const source = document.createElement("p");
    source.className = "result-source";
    source.textContent = example.work ? `${example.author} · «${example.work}»` : example.author;

    const quote = document.createElement("p");
    quote.className = "result-quote";
    quote.textContent = `“${example.text}”`;

    item.append(ticket, source, quote);
    results.append(item);
  });
}

searchInput.addEventListener("input", renderResults);
renderResults();
