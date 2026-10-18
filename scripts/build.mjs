// Pulls live data from the GitHub GraphQL API and regenerates:
//   data/hero-props.json      props for the "projects I built" banner
//   data/upstream-props.json  props for the "merged upstream" banner
//   public/...                project screenshots and org avatars the banners show
//   README.md                 rendered from README.template.md
//   data/profile.json         full snapshot for debugging (not committed)
// Needs GH_TOKEN or GITHUB_TOKEN in the environment.
import {mkdir, readFile, rm, writeFile} from 'node:fs/promises';

const root = new URL('..', import.meta.url);
const path = (p) => new URL(p, root);
const config = JSON.parse(await readFile(path('profile.config.json'), 'utf8'));
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!token) throw new Error('Set GH_TOKEN or GITHUB_TOKEN');
const login = config.login;

async function gql(query, variables) {
	for (let attempt = 1; ; attempt++) {
		const res = await fetch('https://api.github.com/graphql', {
			method: 'POST',
			headers: {Authorization: `bearer ${token}`, 'Content-Type': 'application/json'},
			body: JSON.stringify({query, variables}),
		});
		const body = await res.json().catch(() => ({}));
		if (res.ok && !body.errors) return body.data;
		if (attempt >= 3) throw new Error(`GraphQL ${res.status}: ${JSON.stringify(body.errors ?? body)}`);
		await new Promise((r) => setTimeout(r, 2000 * attempt));
	}
}

async function searchPRs(q) {
	const out = [];
	let after = null;
	do {
		const d = await gql(
			`query($q: String!, $after: String) {
				search(query: $q, type: ISSUE, first: 100, after: $after) {
					pageInfo { hasNextPage endCursor }
					nodes { ... on PullRequest {
						number title url state merged mergedAt createdAt additions deletions
						repository { nameWithOwner name url description stargazerCount isFork createdAt
							owner { login avatarUrl(size: 160) }
							primaryLanguage { name } repositoryTopics(first: 15) { nodes { topic { name } } } }
					} }
				}
			}`,
			{q, after},
		);
		out.push(...d.search.nodes.filter((n) => n.url));
		after = d.search.pageInfo.hasNextPage ? d.search.pageInfo.endCursor : null;
	} while (after);
	return out;
}

const [prs, userData] = await Promise.all([
	searchPRs(`is:pr author:${login} -user:${login}`),
	gql(
		`query($login: String!) { user(login: $login) {
			contributionsCollection { contributionCalendar { totalContributions } }
			repositories(first: 100, ownerAffiliations: OWNER, privacy: PUBLIC, isFork: false, orderBy: {field: PUSHED_AT, direction: DESC}) {
				nodes { name url homepageUrl description isArchived stargazerCount pushedAt
					primaryLanguage { name } licenseInfo { spdxId } releases { totalCount }
					readme: object(expression: "HEAD:README.md") { ... on Blob { text byteSize } } }
			}
		} }`,
		{login},
	),
]);
const user = userData.user;

// ---------- helpers ----------
const day = (iso) => iso.slice(0, 10);
const esc = (s) => s.replace(/[<>]/g, (c) => (c === '<' ? '&lt;' : '&gt;')).replace(/([[\]|])/g, '\\$1');
const fmtK = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n < 10000 ? 1 : 0).replace(/\.0$/, '')}k` : `${n}`);
const monthsAgo = (iso) => (Date.now() - Date.parse(iso)) / (30.44 * 864e5);

async function download(url, file) {
	const res = await fetch(url);
	if (!res.ok) return null;
	await writeFile(path(`public/${file}`), Buffer.from(await res.arrayBuffer()));
	return file;
}

// ---------- my own projects ----------
// Picks the hero visual from the project's own README: the first real image that is not a badge or an icon,
// preferring files named like hero/screenshot/overview/banner/demo.
function readmeImage(repo) {
	const text = repo.readme?.text ?? '';
	const refs = [...text.matchAll(/(?:src="([^"]+)"|!\[[^\]]*\]\(([^)\s]+)\))/g)].map((m) => m[1] ?? m[2]);
	const usable = refs.filter((u) => /\.(png|jpe?g|gif|svg|webp)(\?|$)/i.test(u) && !/shields\.io|badge|\/icons?\/|icon\d*\.|logo/i.test(u));
	const best = usable.find((u) => /hero|screenshot|overview|banner|demo/i.test(u)) ?? usable[0];
	if (!best) return null;
	return /^https?:/.test(best) ? best : `https://raw.githubusercontent.com/${login}/${repo.name}/HEAD/${best.replace(/^\.?\//, '')}`;
}

const P = config.projects;
const eligible = user.repositories.nodes.filter(
	(r) =>
		!r.isArchived &&
		r.description &&
		!P.exclude.includes(r.name) &&
		(r.readme?.byteSize ?? 0) >= P.minReadmeBytes &&
		monthsAgo(r.pushedAt) <= P.maxAgeMonths,
);
// "Respectable" score: evidence that the project is finished and presentable, not just popular.
const score = (r) =>
	(readmeImage(r) ? 4 : 0) +
	Math.min(r.readme.byteSize / 2500, 4) +
	(r.licenseInfo ? 1 : 0) +
	Math.min(r.releases.totalCount, 3) +
	(monthsAgo(r.pushedAt) < 3 ? 2 : monthsAgo(r.pushedAt) < 9 ? 1 : 0) +
	2 * Math.log2(1 + r.stargazerCount);
const ranked = eligible
	.map((r) => ({r, s: score(r), pin: P.pinned.indexOf(r.name)}))
	.sort((a, b) => (a.pin < 0) - (b.pin < 0) || a.pin - b.pin || b.s - a.s)
	.map((x) => x.r);

await rm(path('public/'), {recursive: true, force: true});
await mkdir(path('public/projects/'), {recursive: true});
await mkdir(path('public/orgs/'), {recursive: true});

const PALETTE = ['#58a6ff', '#a371f7', '#3fb950', '#f0883e', '#ff7b72', '#e3b341'];
const projects = await Promise.all(
	ranked.slice(0, Math.max(P.bannerCount, P.tableCount)).map(async (r, i) => {
		const n = P.notes[r.name] ?? {};
		const img = readmeImage(r);
		const ext = img?.match(/\.(png|jpe?g|gif|svg|webp)/i)?.[1].toLowerCase();
		const image = img && i < P.bannerCount ? await download(img, `projects/${r.name}.${ext}`) : null;
		return {
			name: r.name,
			title: n.title ?? r.name,
			url: r.url,
			homepage: r.homepageUrl || null,
			tagline: n.tagline ?? r.description,
			metric: n.metric ?? null,
			stack: n.stack ?? [r.primaryLanguage?.name].filter(Boolean),
			accent: n.accent ?? PALETTE[i % PALETTE.length],
			// Only my own repos' stars, and only once they mean something.
			stars: r.stargazerCount >= P.minStarsToShow ? r.stargazerCount : null,
			what: n.what ?? r.description,
			result: n.result ?? null,
			pushedAt: r.pushedAt,
			image,
		};
	}),
);

// ---------- upstream ----------
const U = config.upstream;
const domains = config.domains.map((d) => ({...d, re: new RegExp(d.match, 'i')}));
const classify = (pr) => {
	const r = pr.repository;
	const text = [r.nameWithOwner, r.description, ...r.repositoryTopics.nodes.map((n) => n.topic.name), pr.title].join(' ');
	return domains.find((d) => d.re.test(text)).id;
};
// Upstream = not my repo, not a fork, not excluded.
const isUpstream = (r) => r.owner.login !== login && !r.isFork && !U.exclude.includes(r.nameWithOwner);
// Established = big AND old enough that its size reflects years of use, not a launch spike.
// Other people's star counts are used only for this test and for ranking; they are never displayed.
const ageYears = (r) => (Date.now() - Date.parse(r.createdAt)) / (365.25 * 864e5);
const isEstablished = (r) => r.stargazerCount >= U.establishedStars && ageYears(r) >= U.establishedYears;

const upstreamPRs = prs.filter((p) => isUpstream(p.repository)).map((p) => ({...p, domain: classify(p)}));
const byRank = (a, b) =>
	isEstablished(b.repository) - isEstablished(a.repository) || (b.mergedAt ?? b.createdAt).localeCompare(a.mergedAt ?? a.createdAt);
const merged = upstreamPRs.filter((p) => p.merged).sort(byRank);
const open = upstreamPRs.filter((p) => p.state === 'OPEN').sort(byRank);
const orgs = [...new Set(merged.map((p) => p.repository.owner.login))];
const establishedRepos = [
	...new Map(merged.filter((p) => isEstablished(p.repository)).map((p) => [p.repository.nameWithOwner, p.repository])).values(),
];

// Banner: the most widely used established projects, one PR each (the latest merged there).
const famous = establishedRepos
	.sort((a, b) => b.stargazerCount - a.stargazerCount)
	.slice(0, U.bannerCount)
	.map((repo) => merged.filter((p) => p.repository.nameWithOwner === repo.nameWithOwner).sort((a, b) => b.mergedAt.localeCompare(a.mergedAt))[0]);
const famousCards = await Promise.all(
	famous.map(async (p) => ({
		repo: p.repository.nameWithOwner,
		number: p.number,
		title: p.title,
		mergedAt: day(p.mergedAt),
		additions: p.additions,
		deletions: p.deletions,
		language: p.repository.primaryLanguage?.name ?? null,
		avatar: await download(p.repository.owner.avatarUrl, `orgs/${p.repository.owner.login}.png`),
	})),
);
const famousOrgs = new Set(famous.map((p) => p.repository.owner.login));

// ---------- README sections ----------
const prLink = (p) => `[${p.repository.nameWithOwner} #${p.number}](${p.url})`;
const prLine = (p) => `- ${prLink(p)}: ${esc(p.title)}`;

function projectsTable() {
	const rows = projects.slice(0, P.tableCount).map((p) => {
		const stars = p.stars ? ` · ★ ${p.stars}` : '';
		const site = p.homepage ? ` · [site](${p.homepage})` : '';
		const result = p.result ?? `Updated ${day(p.pushedAt)}`;
		return `| **[${esc(p.title)}](${p.url})**<br><sub>${p.stack.join(' · ')}${stars}${site}</sub> | ${esc(p.what)} | ${result} |`;
	});
	return ['| Project | What it does | Results |', '| --- | --- | --- |', ...rows].join('\n');
}

function upstreamLists() {
	return domains
		.map((d) => {
			const items = merged.filter((p) => p.domain === d.id);
			if (!items.length) return '';
			const head = items.slice(0, U.perDomain).map(prLine).join('\n');
			const rest = items.slice(U.perDomain);
			const more = rest.length ? `\n\n<details><summary>${rest.length} more</summary>\n\n${rest.map(prLine).join('\n')}\n\n</details>` : '';
			return `**${d.label}** <sub>(${items.length} merged)</sub>\n\n${head}${more}`;
		})
		.filter(Boolean)
		.join('\n\n');
}

function inReview() {
	if (!open.length) return '';
	const items = open.slice(0, U.inReviewMax);
	const names = [...new Set(open.map((p) => p.repository.owner.login))].slice(0, 6).join(', ');
	return `<details>\n<summary><b>${open.length} pull requests in review</b> at ${names} and more</summary>\n\n${items.map(prLine).join('\n')}\n\n</details>`;
}

// ---------- outputs ----------
const stats = {
	projects: eligible.length,
	merged: merged.length,
	orgs: orgs.length,
	established: establishedRepos.length,
	inReview: open.length,
	contributionsLastYear: user.contributionsCollection.contributionCalendar.totalContributions,
};

const heroProps = {
	name: config.name,
	login,
	role: config.role,
	tagline: config.tagline,
	projects: projects
		.slice(0, P.bannerCount)
		.map(({name, title, tagline, metric, stack, accent, stars, image}) => ({name, title, tagline, metric, stack, accent, stars, image})),
	moreProjects: Math.max(0, eligible.length - P.bannerCount),
};

const upstreamProps = {
	cards: famousCards,
	moreMerged: merged.length - famous.length,
	moreOrgs: orgs.filter((o) => !famousOrgs.has(o)).length,
};

const vars = {
	HERO_ALT: esc(`${config.name}, ${config.role}. Projects I built: ${heroProps.projects.map((p) => `${p.title} (${p.tagline})`).join('; ')}.`),
	UPSTREAM_ALT: esc(
		`Merged pull requests in ${famous.map((p) => `${p.repository.nameWithOwner} #${p.number}`).join(', ')}, plus ${upstreamProps.moreMerged} more.`,
	),
	MERGED: stats.merged,
	ORGS: stats.orgs,
	IN_REVIEW: stats.inReview,
	ESTABLISHED: stats.established,
	ESTABLISHED_RULE: `${fmtK(U.establishedStars)}+ stars and ${U.establishedYears}+ years old`,
	BANNER_COUNT: famous.length,
	CONTRIBUTIONS: stats.contributionsLastYear.toLocaleString('en-US'),
	PROJECTS: projectsTable(),
	UPSTREAM: upstreamLists(),
	IN_REVIEW_LIST: inReview(),
	UPDATED: new Date().toISOString().slice(0, 10),
};

const template = await readFile(path('README.template.md'), 'utf8');
const readme = template.replace(/\{\{(\w+)\}\}/g, (m, k) => {
	if (!(k in vars)) throw new Error(`Unknown template variable ${m}`);
	return String(vars[k]);
});

await mkdir(path('data/'), {recursive: true});
await writeFile(path('data/hero-props.json'), JSON.stringify(heroProps, null, 2) + '\n');
await writeFile(path('data/upstream-props.json'), JSON.stringify(upstreamProps, null, 2) + '\n');
await writeFile(
	path('data/profile.json'),
	JSON.stringify({stats, ranked: ranked.map((r) => ({name: r.name, score: +score(r).toFixed(2)})), merged, open}, null, 2) + '\n',
);
// Keep the old "last refreshed" date when nothing else changed, so quiet weeks make no commit.
const previous = await readFile(path('README.md'), 'utf8').catch(() => '');
const prevDate = previous.match(/<!--updated-->(\d{4}-\d{2}-\d{2})/)?.[1];
const same = prevDate && readme.replace(`<!--updated-->${vars.UPDATED}`, `<!--updated-->${prevDate}`) === previous;
if (!same) await writeFile(path('README.md'), readme);
console.log(JSON.stringify(stats));
