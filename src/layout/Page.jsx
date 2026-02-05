function Page({ children, title, className = '' }) {
  return (
    <div className={`page ${className}`.trim()}>
      {title ? <h1>{title}</h1> : null}
      {children}
    </div>
  )
}

export default Page


