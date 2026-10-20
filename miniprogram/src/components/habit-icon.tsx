import LibraryIcon from './library-icon';
export default function HabitIcon({ name }: { name: string }) {
  return <LibraryIcon className='habit-icon' name={name} fallback='plant' />;
}
