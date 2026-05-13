import { useRef, type ReactNode } from "react";
import { useDrag, useDrop } from "react-dnd";

export const SERVICE_DETAIL_BLOCK_ROW = "VITERRA_SERVICE_DETAIL_BLOCK_ROW";

type DragItem = { index: number };

type Props = {
  index: number;
  moveRow: (fromIndex: number, toIndex: number) => void;
  children: ReactNode;
};

export function DetailBlockReorderRow({ index, moveRow, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: SERVICE_DETAIL_BLOCK_ROW,
      item: (): DragItem => ({ index }),
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [index],
  );

  const [, drop] = useDrop(
    () => ({
      accept: SERVICE_DETAIL_BLOCK_ROW,
      hover(item: DragItem, monitor) {
        if (!ref.current) return;
        const dragIndex = item.index;
        const hoverIndex = index;
        if (dragIndex === hoverIndex) return;

        const rect = ref.current.getBoundingClientRect();
        const mid = (rect.bottom - rect.top) / 2;
        const client = monitor.getClientOffset();
        if (!client) return;
        const hoverY = client.y - rect.top;

        if (dragIndex < hoverIndex && hoverY < mid) return;
        if (dragIndex > hoverIndex && hoverY > mid) return;

        moveRow(dragIndex, hoverIndex);
        item.index = hoverIndex;
      },
    }),
    [index, moveRow],
  );

  drag(drop(ref));

  return (
    <div ref={ref} className={isDragging ? "opacity-60" : undefined} style={{ touchAction: "none" }}>
      {children}
    </div>
  );
}
