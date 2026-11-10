import DateStore from "../../../store/DateStore";
import useEmails from "../../../hooks/useEmails";
import components from "../../../components/components";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function Summary() {
    const { date } = DateStore();
    const { data: emails, isLoading } = useEmails(date);
    const { Loading, NoMails } = components;

    if (isLoading) return <Loading />;
    if (!emails || emails.length === 0) return <NoMails />;

    return (
        <div>
            Summary
        </div>
    )

    // return (
    //     <div className="flex gap-x-5 px-2">
    //         <div className="rounded-xl p-3 bg-gradient-to-b from-white to-plum-bg-bold shadow-plum-secondary-sm">
    //             <h3 className="text-xl font-cabin font-medium text-plum-primary">
    //                 Highlights
    //             </h3>
    //             <div className="max-w-80 text-[13px] mt-3 leading-relaxed">
    //                 <ReactMarkdown
    //                     remarkPlugins={[remarkGfm]}
    //                     components={{
    //                         ul: ({ node, ...props }) => (
    //                             <ul className="list-disc list-inside space-y-0.5" {...props} />
    //                         ),
    //                         li: ({ node, ...props }) => (
    //                             <li {...props} />
    //                         ),
    //                     }}
    //                 >
    //                     {body}
    //                 </ReactMarkdown>
    //             </div>
    //         </div>
    //         {/*  */}
    //         <div className="rounded-xl p-3 bg-gradient-to-b from-white to-plum-bg-bold shadow-plum-secondary-sm">
    //             <h3 className="text-xl font-cabin font-medium text-plum-primary">
    //                 Insights
    //             </h3>
    //             <div className="max-w-80 text-sm mt-2 leading-relaxed">
    //                 <ReactMarkdown
    //                     remarkPlugins={[remarkGfm]}
    //                     components={{
    //                         ul: ({ node, ...props }) => (
    //                             <ul className="list-disc list-inside space-y-0.5" {...props} />
    //                         ),
    //                         li: ({ node, ...props }) => (
    //                             <li {...props} />
    //                         ),
    //                     }}
    //                 >
    //                     {body}
    //                 </ReactMarkdown>
    //             </div>
    //         </div>
    //         <div className="rounded-xl p-3 bg-gradient-to-b from-white to-plum-bg-bold shadow-plum-secondary-sm">
    //             <h3 className="text-xl font-cabin font-medium text-plum-primary">
    //                 Actions
    //             </h3>
    //             <div className="max-w-80 text-sm mt-2 leading-relaxed">
    //                 <ReactMarkdown
    //                     remarkPlugins={[remarkGfm]}
    //                     components={{
    //                         ul: ({ node, ...props }) => (
    //                             <ul className="list-disc list-inside space-y-0.5" {...props} />
    //                         ),
    //                         li: ({ node, ...props }) => (
    //                             <li {...props} />
    //                         ),
    //                     }}
    //                 >
    //                     {body}
    //                 </ReactMarkdown>
    //             </div>
    //         </div>
    //     </div>
    // );
}
export default Summary