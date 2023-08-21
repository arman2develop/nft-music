
export {  default as MyButton } from './Button';


export function add(a: number, b: number): number {
	return a + b;
}
export interface User {
  firstName: string;
  lastName: string;
  email: string;
  userName: string;
  isAdmin: boolean;
}

export function greetUser(user: User) {
  alert(
    `Hello, ${user.firstName} ${user.lastName}! You are ${
      user.isAdmin ? "an admin." : "not an admin."
    }`
  );
}