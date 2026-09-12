export default function Heading({ as: Tag = "h2", children, ...props }) {
  return <Tag {...props}>{children}</Tag>;
}
