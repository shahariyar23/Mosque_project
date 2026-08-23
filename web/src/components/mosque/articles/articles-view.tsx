"use client";

import { useMemo, useState } from "react";
import { Button, IconButton } from "@/components/finance/ui/button";
import { DataTable, type Column } from "@/components/finance/ui/data-table";
import { FinanceFilters, type SelectFilter } from "@/components/finance/ui/filters";
import { SelectField, TextAreaField, TextField } from "@/components/finance/ui/form-field";
import { Modal } from "@/components/finance/ui/modal";
import { Panel, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { FinanceEmptyState, InlineNotice } from "@/components/finance/ui/states";
import { DetailDrawer, DetailField, DetailGrid, DetailSection, DetailStats } from "@/components/ui/detail-drawer";
import { StatGrid } from "@/components/ui/stat-card";
import { ArticleCategoryChip, ArticleStatusBadge, Chip } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { articles as seedArticles, articleStats } from "@/data/articles";
import { downloadCsv } from "@/lib/mosque/export";
import { formatCount, formatLongDate, REFERENCE_DATE } from "@/lib/mosque/format";
import {
  articleCategories,
  articleStatuses,
  contentLanguages,
  type Article,
  type ArticleDraft,
  type StatMetric,
} from "@/lib/mosque/types";

/**
 * The article register — the mosque's written content.
 *
 * The body of an article is not modelled here; the register carries the title, an excerpt and the
 * publishing metadata, which is what a list needs. Same shape as the other modules: this component
 * owns only the search predicate, and the shared `DataTable` handles sort, paging and mobile cards.
 * A published article reports its reach; a draft or scheduled one has none yet.
 */
const metrics: StatMetric[] = [
  {
    id: "total",
    label: "Articles",
    value: formatCount(articleStats.total),
    hint: "In the register",
    icon: "file-text",
    tone: "neutral",
  },
  {
    id: "published",
    label: "Published",
    value: formatCount(articleStats.published),
    hint: "Live on the site",
    icon: "check-circle",
    tone: "positive",
  },
  {
    id: "drafts",
    label: "Drafts",
    value: formatCount(articleStats.drafts),
    hint: "In preparation",
    icon: "pencil",
    tone: "warning",
  },
  {
    id: "views",
    label: "Total Views",
    value: formatCount(articleStats.totalViews),
    hint: "Across published articles",
    icon: "eye",
    tone: "gold",
  },
];

const emptyDraft: ArticleDraft = {
  title: "",
  author: "",
  category: "Community",
  status: "Draft",
  language: "English",
  excerpt: "",
  body: "",
  tags: "",
};

/** Draft and scheduled articles have no reach yet, so an em dash reads better than a bare 0. */
const reachLabel = (views: number) => (views === 0 ? "—" : formatCount(views));

const slugify = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function ArticlesView({ openAddOnMount = false }: { openAddOnMount?: boolean }) {
  const { notify } = useToast();
  const [articleList, setArticleList] = useState<Article[]>(seedArticles);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [language, setLanguage] = useState("all");
  const [selected, setSelected] = useState<Article | null>(null);
  const [adding, setAdding] = useState(openAddOnMount);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return articleList.filter((article) => {
      if (needle) {
        const haystack =
          `${article.title} ${article.author} ${article.excerpt} ${article.id} ${article.category} ${article.tags.join(" ")}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (category !== "all" && article.category !== category) return false;
      if (status !== "all" && article.status !== status) return false;
      if (language !== "all" && article.language !== language) return false;
      return true;
    });
  }, [articleList, category, language, search, status]);

  const filters: SelectFilter[] = [
    {
      id: "category",
      label: "Category",
      value: category,
      onChange: setCategory,
      options: [
        { value: "all", label: "All categories" },
        ...articleCategories.map((value) => ({ value, label: value })),
      ],
    },
    {
      id: "status",
      label: "Status",
      value: status,
      onChange: setStatus,
      options: [{ value: "all", label: "Any status" }, ...articleStatuses.map((value) => ({ value, label: value }))],
    },
    {
      id: "language",
      label: "Language",
      value: language,
      onChange: setLanguage,
      options: [{ value: "all", label: "Any language" }, ...contentLanguages.map((value) => ({ value, label: value }))],
    },
  ];

  const activeFilterCount = (category !== "all" ? 1 : 0) + (status !== "all" ? 1 : 0) + (language !== "all" ? 1 : 0);
  const resetFilters = () => {
    setCategory("all");
    setStatus("all");
    setLanguage("all");
  };

  const addArticle = (draft: ArticleDraft) => {
    const words = draft.body.trim().split(/\s+/).filter(Boolean).length;
    const tags = draft.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const article: Article = {
      id: `ART-${String(articleList.length + 1).padStart(3, "0")}`,
      title: draft.title.trim(),
      slug: slugify(draft.title) || `article-${articleList.length + 1}`,
      author: draft.author.trim(),
      category: draft.category,
      status: draft.status,
      language: draft.language,
      publishedAt: REFERENCE_DATE,
      updatedAt: REFERENCE_DATE,
      readingMinutes: words > 0 ? Math.max(1, Math.round(words / 200)) : 4,
      excerpt: draft.excerpt.trim(),
      tags,
      views: 0,
      featured: false,
    };

    setArticleList((current) => [article, ...current]);
    setAdding(false);
    notify({
      message: "Article added to the register.",
      description: `${article.title} · ${article.id} — held in this browser only.`,
    });
  };

  const exportCsv = () => {
    downloadCsv("noor-mosque-articles.csv", filtered, [
      { header: "Article ID", value: (article) => article.id },
      { header: "Title", value: (article) => article.title },
      { header: "Slug", value: (article) => article.slug },
      { header: "Author", value: (article) => article.author },
      { header: "Category", value: (article) => article.category },
      { header: "Status", value: (article) => article.status },
      { header: "Language", value: (article) => article.language },
      { header: "Published", value: (article) => article.publishedAt },
      { header: "Updated", value: (article) => article.updatedAt },
      { header: "Reading (min)", value: (article) => article.readingMinutes },
      { header: "Views", value: (article) => article.views },
      { header: "Tags", value: (article) => article.tags.join("; ") },
    ]);
    notify({
      tone: "info",
      message: "Export downloaded.",
      description: `${formatCount(filtered.length)} rows, matching the filters currently applied.`,
    });
  };

  const columns: Column<Article>[] = [
    {
      key: "article",
      header: "Article",
      cell: (article) => (
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="truncate font-medium text-[#17211d]">{article.title}</span>
            {article.featured ? (
              <span
                className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-[#c79a45]"
                title="Featured on the homepage"
              >
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                  <path d="M8 1.2l1.9 3.85 4.25.62-3.07 3 .72 4.23L8 10.9l-3.8 2 .72-4.23-3.07-3 4.25-.62L8 1.2z" />
                </svg>
              </span>
            ) : null}
          </span>
          <span className="block truncate text-[12px] text-[#69726d]">{article.author}</span>
        </span>
      ),
      sortValue: (article) => article.title,
    },
    {
      key: "category",
      header: "Category",
      cell: (article) => <ArticleCategoryChip category={article.category} />,
      sortValue: (article) => article.category,
    },
    {
      key: "published",
      header: "Published",
      cell: (article) => <span className="whitespace-nowrap text-[#3d453f]">{formatLongDate(article.publishedAt)}</span>,
      sortValue: (article) => article.publishedAt,
    },
    {
      key: "views",
      header: "Views",
      align: "right",
      cell: (article) => <span className="tabular-nums text-[#3d453f]">{reachLabel(article.views)}</span>,
      sortValue: (article) => article.views,
    },
    {
      key: "status",
      header: "Status",
      cell: (article) => <ArticleStatusBadge status={article.status} />,
      sortValue: (article) => article.status,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      align: "right",
      cell: (article) => (
        <span className="flex items-center justify-end gap-1">
          <IconButton icon="eye" label={`View ${article.title}`} onClick={() => setSelected(article)} />
          <Can permission="article.manage">
            <IconButton icon="pencil" label={`Edit ${article.title}`} onClick={() => setSelected(article)} />
          </Can>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <StatGrid metrics={metrics} />

      <Panel>
        <PanelHeader
          title="Articles"
          description="Reminders, explainers and seasonal pieces the mosque publishes to its community."
          icon="file-text"
          actions={
            <>
              <Button variant="secondary" size="sm" icon="download" onClick={exportCsv}>
                Export
              </Button>
              <Can permission="article.manage">
                <Button size="sm" icon="plus" onClick={() => setAdding(true)}>
                  Add Article
                </Button>
              </Can>
            </>
          }
        />

        <FinanceFilters
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Search by title, author, tag…",
            label: "Search articles by title, author, excerpt, category, tag or ID",
          }}
          filters={filters}
          activeCount={activeFilterCount}
          onReset={resetFilters}
        />

        <DataTable
          rows={filtered}
          columns={columns}
          getRowKey={(article) => article.id}
          caption="Articles with category, publication date, reach and status"
          initialSort={{ key: "published", direction: "desc" }}
          pageSize={10}
          mobileTitle={(article) => article.title}
          mobileSubtitle={(article) => `${article.category} · ${article.author}`}
          mobileTrailing={(article) => <ArticleStatusBadge status={article.status} />}
          mobileHiddenKeys={["article", "status"]}
          emptyState={
            <FinanceEmptyState
              icon="file-text"
              title="No articles found."
              description={
                activeFilterCount > 0 || search
                  ? "Nothing matches the current search and filters. Try clearing them."
                  : "The register is empty. Add the first article to start publishing."
              }
              action={
                activeFilterCount > 0 || search ? (
                  <Button
                    variant="secondary"
                    icon="close"
                    onClick={() => {
                      resetFilters();
                      setSearch("");
                    }}
                  >
                    Clear search and filters
                  </Button>
                ) : (
                  <Can permission="article.manage">
                    <Button icon="plus" onClick={() => setAdding(true)}>
                      Add Article
                    </Button>
                  </Can>
                )
              }
            />
          }
        />
      </Panel>

      {selected ? <ArticleDetailDrawer article={selected} onClose={() => setSelected(null)} /> : null}
      <AddArticleModal open={adding} onClose={() => setAdding(false)} onSave={addArticle} />
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Detail drawer
 * -------------------------------------------------------------------------- */

function ArticleDetailDrawer({ article, onClose }: { article: Article; onClose: () => void }) {
  return (
    <DetailDrawer
      open
      onClose={onClose}
      eyebrow={article.id}
      title={article.title}
      subtitle={`By ${article.author}`}
      badge={
        <>
          <ArticleStatusBadge status={article.status} />
          <ArticleCategoryChip category={article.category} />
        </>
      }
      footer={
        <>
          <Can permission="article.manage">
            <Button size="sm" icon="pencil">
              Edit article
            </Button>
          </Can>
          <Button size="sm" variant="secondary" onClick={onClose} className="ml-auto">
            Close
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {article.status === "Scheduled" ? (
          <InlineNotice tone="info" icon="clock">
            Scheduled to publish on {formatLongDate(article.publishedAt)}. It is not visible to the community until then.
          </InlineNotice>
        ) : null}
        {article.status === "Draft" ? (
          <InlineNotice tone="neutral" icon="pencil">
            Draft — kept out of the community&rsquo;s view until it is published.
          </InlineNotice>
        ) : null}
        {article.status === "Archived" ? (
          <InlineNotice tone="neutral" icon="info">
            Archived — retired from the live site but kept on record. It can be restored at any time.
          </InlineNotice>
        ) : null}

        <DetailStats
          items={[
            { label: "Views", value: reachLabel(article.views) },
            { label: "Reading time", value: `${article.readingMinutes} min` },
            { label: "Language", value: article.language },
          ]}
        />

        <DetailSection title="Excerpt">
          <p className="text-[13px] leading-6 text-[#4d564f]">{article.excerpt}</p>
        </DetailSection>

        {article.tags.length > 0 ? (
          <DetailSection title="Tags">
            <div className="flex flex-wrap gap-1.5">
              {article.tags.map((tag) => (
                <Chip key={tag}>{tag}</Chip>
              ))}
            </div>
          </DetailSection>
        ) : null}

        <DetailSection title="Details">
          <DetailGrid>
            <DetailField label="Author" value={article.author} />
            <DetailField label="Category" value={<ArticleCategoryChip category={article.category} />} />
            <DetailField
              label={article.status === "Scheduled" ? "Publishes" : "Published"}
              value={formatLongDate(article.publishedAt)}
            />
            <DetailField label="Last updated" value={formatLongDate(article.updatedAt)} />
            <DetailField label="Slug" value={<span className="font-mono text-[12px]">{article.slug}</span>} full />
            <DetailField label="Featured" value={article.featured ? "On the homepage" : "No"} />
          </DetailGrid>
        </DetailSection>
      </div>
    </DetailDrawer>
  );
}

/* -------------------------------------------------------------------------- *
 * Add article
 * -------------------------------------------------------------------------- */

function AddArticleModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (draft: ArticleDraft) => void;
}) {
  const [draft, setDraft] = useState<ArticleDraft>(emptyDraft);
  const [submitted, setSubmitted] = useState(false);

  const set = <Key extends keyof ArticleDraft>(key: Key, value: ArticleDraft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const errors = {
    title: draft.title.trim().length === 0 ? "An article needs a title." : undefined,
    author: draft.author.trim().length === 0 ? "Name the author." : undefined,
    excerpt: draft.excerpt.trim().length === 0 ? "Add a short excerpt for the list and cards." : undefined,
  };
  const valid = Object.values(errors).every((error) => error === undefined);
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);

  const close = () => {
    setDraft(emptyDraft);
    setSubmitted(false);
    onClose();
  };

  const submit = () => {
    setSubmitted(true);
    if (!valid) return;
    onSave(draft);
    setDraft(emptyDraft);
    setSubmitted(false);
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add article"
      description="Starts a new article in the register. The full editor is a later step; this captures the essentials."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button icon="check" onClick={submit}>
            Add Article
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Title"
          required
          value={draft.title}
          onChange={(event) => set("title", event.target.value)}
          error={show("title")}
          placeholder="A Practical Guide to Calculating Your Zakat"
          containerClassName="sm:col-span-2"
        />
        <TextField
          label="Author"
          required
          value={draft.author}
          onChange={(event) => set("author", event.target.value)}
          error={show("author")}
          placeholder="Imam Abdul Karim"
        />
        <SelectField
          label="Category"
          required
          value={draft.category}
          options={[...articleCategories]}
          onChange={(event) => set("category", event.target.value as ArticleDraft["category"])}
        />
        <SelectField
          label="Status"
          required
          value={draft.status}
          options={[...articleStatuses]}
          onChange={(event) => set("status", event.target.value as ArticleDraft["status"])}
          hint="Draft keeps it off the live site until it is ready."
        />
        <SelectField
          label="Language"
          required
          value={draft.language}
          options={[...contentLanguages]}
          onChange={(event) => set("language", event.target.value as ArticleDraft["language"])}
        />
        <TextAreaField
          label="Excerpt"
          required
          rows={3}
          value={draft.excerpt}
          onChange={(event) => set("excerpt", event.target.value)}
          error={show("excerpt")}
          hint="One or two sentences, shown in the list and on cards."
          containerClassName="sm:col-span-2"
        />
        <TextAreaField
          label="Body"
          rows={5}
          value={draft.body}
          onChange={(event) => set("body", event.target.value)}
          hint="Optional here — the reading time is estimated from what you paste in."
          containerClassName="sm:col-span-2"
        />
        <TextField
          label="Tags"
          value={draft.tags}
          onChange={(event) => set("tags", event.target.value)}
          hint="Comma-separated — e.g. Zakat, Wealth, Nisab."
          containerClassName="sm:col-span-2"
        />
      </div>

      {submitted && !valid ? (
        <InlineNotice className="mt-4" tone="neutral" icon="alert">
          Some details still need attention — see the messages above.
        </InlineNotice>
      ) : (
        <InlineNotice className="mt-4" tone="gold">
          Front-end preview — the article is added to this browser session only.
        </InlineNotice>
      )}
    </Modal>
  );
}
