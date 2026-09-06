import {notFound} from 'next/navigation';
import Concepts from './Concepts';
export default function Page(){if(process.env.NODE_ENV!=='development')notFound();return <Concepts/>;}
