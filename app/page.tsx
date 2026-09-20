import Dashboard from './dashboard';
import {getAdminUser} from './admin-auth';
export const dynamic='force-dynamic';
export default async function Home(){return <Dashboard signedIn={!!await getAdminUser()}/>}

