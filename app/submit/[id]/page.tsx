import SubmitForm from './submit-form';
export default async function SubmitPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <SubmitForm id={id}/>}
