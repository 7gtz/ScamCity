import { expect, it } from "vitest";
import { activeDialog, requestDialog, subscribeDialogs } from "./dialog-manager";
it("allows only one active dialog and releases ownership in request order", () => {
  let changes = 0;
  const unsubscribe = subscribeDialogs(() => changes++);
  const closeFirst = requestDialog("first");
  const closeSecond = requestDialog("second");
  expect(activeDialog()).toBe("first");
  closeFirst();
  expect(activeDialog()).toBe("second");
  closeSecond();
  expect(activeDialog()).toBeNull();
  expect(changes).toBe(4);
  unsubscribe();
});
