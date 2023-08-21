import styled from "styled-components";
const Button = styled.button`
  padding: 1em;
  background-color: red;
`;
function add(a, b) {
  return a + b;
}
function greetUser(user) {
  alert(
    `Hello, ${user.firstName} ${user.lastName}! You are ${user.isAdmin ? "an admin." : "not an admin."}`
  );
}
export { Button as MyButton, add, greetUser };
//# sourceMappingURL=sharedfront.es.js.map
