import {env} from 'cloudflare:workers';
import {GitHubHomeworkStorage} from './github-storage';
export function homeworkStorage(){return new GitHubHomeworkStorage({owner:env.GITHUB_OWNER||'',repo:env.GITHUB_HOMEWORK_REPO||'',branch:env.GITHUB_HOMEWORK_BRANCH||'main',token:env.GITHUB_TOKEN||''})}
