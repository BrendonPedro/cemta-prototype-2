// components/MenuItemsTable.tsx

const MenuItemsTable = ({ items }) => {
  return (
    <table>
      <thead>
        <tr>
          <th>Original (Chinese)</th>
          <th>Price (NTD)</th>
          <th>Pinyin</th>
          <th>English</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => (
          <tr key={index}>
            <td>{item.original}</td>
            <td>{item.price}</td>
            <td>{item.pinyin}</td>
            <td>{item.english}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default MenuItemsTable;

