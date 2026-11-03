// One geometry assertion reused by mini adapters and production web tests.
module.exports=async function assertPopupSpacing(panel,expect){
 const body=panel.locator('.entity-choice-body');await expect(body).toBeVisible();
 await expect(body).toHaveCSS('padding-left','16px');await expect(body).toHaveCSS('padding-right','16px');await expect(body).toHaveCSS('padding-bottom','16px');
 const scroll=panel.locator('.form-popover-scroll');await scroll.evaluate(node=>{node.scrollTop=node.scrollHeight;});
 const box=await panel.boundingBox(),list=await panel.locator('.entity-choice-options').boundingBox();expect(box.y+box.height-list.y-list.height).toBeGreaterThanOrEqual(15);
};
