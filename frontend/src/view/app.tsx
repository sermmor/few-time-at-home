import * as React from 'react';

export const enum WebStatus { RSS, Configuration };

const styleTitle = (): React.CSSProperties => ({
    textAlign: "center",
    textTransform: "uppercase",
    color: "rgba(0, 0, 0, 0.54)",
    fontFamily: "Helvetica",
    letterSpacing: "0.00938em",
});

export const App = () => {
    const [webStatus, setWebStatus] = React.useState(WebStatus.RSS);

    return (<>
        <div>HOLA</div>
    </>)

    // return (<>
    //     <h1 style={styleTitle()}>Profiles News Searcher</h1>
    //     <div style={({display: (webStatus === WebStatus.Login? 'inline' : 'none')})}>
    //         <LoginFormComponent showLogin={setWebStatus}/>
    //     </div>
    //     <div style={({display: (webStatus === WebStatus.Configuration? 'inline' : 'none')})}>
    //         {/* <h2 style={styleTitle()}>Workflow Status</h2>
    //         <WorkflowStatusComponent /> */}
    //         <h2 style={({...styleTitle(), marginTop: "3rem"})}>Json files</h2>
    //         <LogManagerComponent />
    //         <h2 style={({...styleTitle(), marginTop: "3rem"})}>Configuration</h2>
    //         <ConfigurationFormComponent/>
    //     </div>
    // </>);
}
