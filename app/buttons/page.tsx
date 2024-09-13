import { Button } from "@/components/ui/button";

const ButtonsPage = () => {
  return (
    <div className="p-4 space-y-4 flex flex-col max-w-[200px]">
      <Button>default</Button>
      <Button variant="locked">Locked</Button>
      <Button variant="primary">Primary</Button>
      <Button variant="primaryOutline">Primary Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="secondaryOutline">Secondary Outline</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="dangerOutline">Danger Outline</Button>
      <Button variant="super">Super</Button>
      <Button variant="superOutline">Super Outline</Button>
      <Button variant="cemta">Cemta</Button>
      <Button variant="cemtaOutline">Cemta Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="ghostTeal">Ghost Teal</Button>
      <Button variant="sidebar">Sidebar</Button>
      <Button variant="sidebarOutline">Sidebar Outline</Button>
      <Button variant="nextButton">Next Button</Button>
      <Button variant="nextButton2">Next Button2</Button>

      <Button variant="default2">Default2</Button>
      <Button variant="destructive2">Destructive2</Button>
      <Button variant="outline2">Outline2</Button>
      <Button variant="secondary2">Secondary2</Button>
      <Button variant="ghost2">Ghost2</Button>
      <Button variant="link2">Link2</Button>
      <Button variant="cemta2">Cemta2</Button>
      <Button variant="nextButton2">Next Button2</Button>
      <Button variant="nextButton3">Next Button3</Button>
    </div>
  );
};

export default ButtonsPage;
