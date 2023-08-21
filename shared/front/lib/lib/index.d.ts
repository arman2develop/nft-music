export { default as MyButton } from './Button';
export declare function add(a: number, b: number): number;
export interface User {
    firstName: string;
    lastName: string;
    email: string;
    userName: string;
    isAdmin: boolean;
}
export declare function greetUser(user: User): void;
