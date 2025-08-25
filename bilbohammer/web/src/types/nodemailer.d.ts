// Minimal ambient declaration so TS doesn't complain if @types/nodemailer is missing
declare module "nodemailer" {
  const nodemailer: any;
  export default nodemailer;
}
